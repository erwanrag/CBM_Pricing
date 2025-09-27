#backend/app/services/alertes/alertes_service.py
from collections import defaultdict
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.common.redis_client import redis_client
from app.common.constants import REDIS_TTL_MEDIUM, REDIS_TTL_SHORT
from app.cache.cache_keys import alertes_summary_key
from app.schemas.alertes.alertes_schema import (
    AlertesSyntheseItem,
    AlertesDetailItem,
    AlertesSummaryRequest,
    ParametrageRegleSchema
)
from app.common.sql_utils import sanitize_sort_column, sanitize_sort_direction
from app.common.logger import logger
from app.common.sortable_columns import ALERTES_COLUMNS
from app.services.filters.product_identifier_filter_service import  extract_cod_pro_list
import json

# ============================================================
async def get_parametrage_regles(db: AsyncSession) -> list[dict]:
    key = "parametrage:alertes"
    try:
        cached = await redis_client.get(key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] Erreur sur get_parametrage_regles")

    query = """
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        SELECT code_regle, libelle_regle, categorie, est_active, criticite, seuil_1, seuil_2, unite
        FROM CBM_DATA.Pricing.Parametrage_Alertes
        WHERE est_active = 1
        ORDER BY ordre_affichage ASC
    """
    result = await db.execute(text(query))
    data = [dict(r._mapping) for r in result.fetchall()]
    await redis_client.set(key, json.dumps(data), ex=REDIS_TTL_MEDIUM)
    return data

  # ============================================================
async def get_alertes_summary(payload: AlertesSummaryRequest, db: AsyncSession):
    key = alertes_summary_key(func=None, **payload.model_dump())

    try:
        cached = await redis_client.get(key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] alertes_summary_key fallback")

    limit = max(min(payload.limit, 200), 10)
    offset = max(payload.page - 1, 0) * limit
    params = {"offset": offset, "limit": limit}
    filters = []

    # 🔍 Construction de la logique produit
    cod_pro_list = await extract_cod_pro_list(payload, db)

    # Ne filtrer que si cod_pro_list n'est pas vide et si des critères ont été renseignés
    has_product_filter = (
        payload.cod_pro is not None or
        payload.ref_crn is not None or
        payload.refint is not None or
        payload.grouping_crn == 1 or
        payload.qualite is not None
    )

    if has_product_filter and cod_pro_list:
        placeholders = ", ".join([f":p{i}" for i in range(len(cod_pro_list))])
        filters.append(f"cod_pro IN ({placeholders})")
        for i, cod in enumerate(cod_pro_list):
            params[f"p{i}"] = cod

    # Filtres supplémentaires
    if payload.code_regle:
        filters.append(f"ISNULL(nb_{payload.code_regle}, 0) > 0")
    if payload.refint:
        filters.append("refint LIKE :refint")
        params["refint"] = f"%{payload.refint}%"
    if payload.no_tarif:
        filters.append("no_tarif = :no_tarif")
        params["no_tarif"] = payload.no_tarif

    where_clause = f" WHERE {' AND '.join(filters)}" if filters else ""

    # Tri
    sort_by = sanitize_sort_column(payload.sort_by, ALERTES_COLUMNS, default="ca_total")
    sort_dir = sanitize_sort_direction(payload.sort_dir)

    # Pagination
    if not payload.export_all:
        params["offset"] = offset
        params["limit"] = limit
        pagination_clause = "OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY"
    else:
        pagination_clause = ""

    # Requête SQL count
    count_query = f"""
        SET NOCOUNT ON;
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        SELECT COUNT(*) FROM CBM_DATA.Pricing.Alertes_Synthese WITH (NOLOCK)
        {where_clause}
    """

    # Requête SQL données
    data_query = f"""
        SET NOCOUNT ON; 
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        SELECT * FROM CBM_DATA.Pricing.Alertes_Synthese WITH (NOLOCK)
        {where_clause}
        ORDER BY {sort_by} {sort_dir.upper()}
        {pagination_clause}
    """

    total = (await db.execute(text(count_query), params)).scalar()
    rows = (await db.execute(text(data_query), params)).fetchall()

    response = {
        "total": total,
        "rows": [AlertesSyntheseItem(**r._mapping).model_dump(mode="json") for r in rows]
    }

    await redis_client.set(key, json.dumps(response), ex=REDIS_TTL_SHORT)
    return response


# ============================================================
async def get_alertes_details(cod_pro: int, no_tarif: int, db: AsyncSession):
    key = f"alertes:details:{cod_pro}:{no_tarif}"
    try:
        cached = await redis_client.get(key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] alertes_details fallback")

    query = """
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        SELECT *
        FROM CBM_DATA.Pricing.vw_Alertes_Detaillees
        WHERE cod_pro = :cod_pro AND no_tarif = :no_tarif
    """
    result = await db.execute(text(query), {"cod_pro": cod_pro, "no_tarif": no_tarif})
    data = jsonable_encoder([AlertesDetailItem(**r._mapping) for r in result.fetchall()])
    await redis_client.set(key, json.dumps(data), ex=REDIS_TTL_MEDIUM)
    return data

# ============================================================
async def get_alertes_map(db: AsyncSession, cod_pro_list: list[int], no_tarif: int) -> dict:
    key = f"alertes:map:{no_tarif}:{','.join(map(str, cod_pro_list))}"
    try:
        cached = await redis_client.get(key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] alertes_map fallback")

    if not cod_pro_list:
        return {}
    placeholders = ", ".join([f":p{i}" for i in range(len(cod_pro_list))])
    query = f"""
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        SELECT cod_pro, code_regle
        FROM CBM_DATA.Pricing.vw_Alertes_Detaillees
        WHERE no_tarif = :no_tarif AND cod_pro IN ({placeholders})
        AND ISNULL(statut_utilisateur, '') = ''
    """

    params = {"no_tarif": no_tarif}
    params.update({f"p{i}": cod for i, cod in enumerate(cod_pro_list)})

    result = await db.execute(text(query), params)
    alertes_map = defaultdict(lambda: defaultdict(list))

    for row in result.fetchall():
        if row.code_regle == "QLT_09":
            alertes_map[row.cod_pro]["px_vente"].append(row.code_regle)
        elif row.code_regle == "FIN_01":
            alertes_map[row.cod_pro]["marge_relative"].append(row.code_regle)
        elif row.code_regle == "FIN_02":
            alertes_map[row.cod_pro]["stock"].append(row.code_regle)

    data = {
        "items": [
            {"cod_pro": cod_pro, "champ": champ, "code_regle": code}
            for cod_pro, champs in alertes_map.items()
            for champ, codes in champs.items()
            for code in codes
        ]
    }

    await redis_client.set(key, json.dumps(data), ex=REDIS_TTL_MEDIUM)
    return data
