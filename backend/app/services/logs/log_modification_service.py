# backend/app/services/log_modification/log_modification_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.common.redis_client import redis_client
from app.cache.cache_keys import generic_cache_key
from app.schemas.logs.log_modification_schema import LogModificationEntry
from app.common.constants import REDIS_TTL_SHORT
from app.common.logger import logger
import json


async def log_modifications_in_db(entries: list[LogModificationEntry], db: AsyncSession, user_email: str):
    for entry in entries:
        await db.execute(text("""
            INSERT INTO [Pricing].[Log_modifications_tarif]
            (cod_pro, refint, no_tarif, ancien_prix, nouveau_prix, ancienne_marge,
             marge_simulee, statut_utilisateur, commentaire_utilisateur, date_modification, utilisateur)
            VALUES
            (:cod_pro, :refint, :no_tarif, :ancien_prix, :nouveau_prix, :ancienne_marge,
             :marge_simulee, :statut_utilisateur, :commentaire_utilisateur, GETDATE(), :utilisateur)
        """), {
            "cod_pro": entry.cod_pro,
            "refint": entry.refint,
            "no_tarif": entry.no_tarif,
            "ancien_prix": entry.ancien_prix,
            "nouveau_prix": entry.nouveau_prix,
            "ancienne_marge": entry.ancienne_marge,
            "marge_simulee": entry.marge_simulee,
            "statut_utilisateur": entry.statut_utilisateur,
            "commentaire_utilisateur": entry.commentaire_utilisateur,
            "utilisateur": user_email
        })

        await db.execute(text("""
            UPDATE [CBM_DATA].[Pricing].[Alertes_Tarif]
            SET statut_utilisateur = :statut_utilisateur,
                commentaire_utilisateur = :commentaire_utilisateur,
                date_action_utilisateur = GETDATE(),
                auteur_action = :utilisateur
            WHERE cod_pro = :cod_pro AND no_tarif = :no_tarif AND est_active = 1
        """), {
            "cod_pro": entry.cod_pro,
            "no_tarif": entry.no_tarif,
            "statut_utilisateur": entry.statut_utilisateur,
            "commentaire_utilisateur": entry.commentaire_utilisateur,
            "utilisateur": user_email
        })

    await db.commit()


async def fetch_modification_history_paginated(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    cod_pro: int = None,
    refint: str = None,
    no_tarif: int = None
):
    base_query = "SELECT * FROM [Pricing].[Log_modifications_tarif] WHERE 1=1"
    count_query = "SELECT COUNT(*) AS total FROM [Pricing].[Log_modifications_tarif] WHERE 1=1"
    params = {}

    if cod_pro:
        base_query += " AND cod_pro = :cod_pro"
        count_query += " AND cod_pro = :cod_pro"
        params["cod_pro"] = cod_pro

    if refint:
        base_query += " AND refint = :refint"
        count_query += " AND refint = :refint"
        params["refint"] = refint

    if no_tarif:
        base_query += " AND no_tarif = :no_tarif"
        count_query += " AND no_tarif = :no_tarif"
        params["no_tarif"] = no_tarif

    base_query += " ORDER BY date_modification DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY"
    params["offset"] = (page - 1) * page_size
    params["limit"] = page_size

    redis_key = generic_cache_key(
        "modifs:log",
        page=page,
        page_size=page_size,
        cod_pro=cod_pro,
        refint=refint,
        no_tarif=no_tarif
    )
    try:
        cached = await redis_client.get(redis_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] fetch_modification_history fallback")

    data_result = await db.execute(text(base_query), params)
    count_result = await db.execute(text(count_query), params)

    rows = [dict(row) for row in data_result.mappings().all()]
    total = count_result.scalar_one()

    result = {"total": total, "rows": rows}
    try:
        await redis_client.set(redis_key, json.dumps(result), ex=REDIS_TTL_SHORT)
    except Exception:
        logger.exception("[Redis] modif_log set failed")

    return result
