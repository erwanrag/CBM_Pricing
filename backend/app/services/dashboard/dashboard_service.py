# backend/app/services/dashboard/dashboard_service.py

import json
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException

from app.schemas.dashboard.dashboard_schema import DashboardFilterRequest
from app.schemas.produits.identifier_schema import ProductIdentifierRequest
from app.services.filters.product_identifier_filter_service import resolve_cod_pro_list
from app.common.redis_client import redis_client
from app.common.constants import REDIS_TTL_SHORT
from app.common.logger import logger
from app.cache.cache_keys import dashboard_kpi_key, dashboard_histo_key, dashboard_products_key

async def extract_cod_pro_list(payload: DashboardFilterRequest, db: AsyncSession) -> list[int]:
    identifier_payload = ProductIdentifierRequest(
        cod_pro=payload.cod_pro,
        ref_crn=payload.ref_crn,
        refint=payload.refint,
        grouping_crn=payload.grouping_crn,
        qualite=payload.qualite
    )

    if payload.cod_pro_list:
        return payload.cod_pro_list
    elif payload.cod_pro:
        return [payload.cod_pro]
    else:
        return await resolve_cod_pro_list(identifier_payload, db)


async def get_dashboard_kpi(payload: DashboardFilterRequest, db: AsyncSession):
    payload.cod_pro_list = await extract_cod_pro_list(payload, db)
    logger.info(f"[get_dashboard_kpi] cod_pro_list: {payload.cod_pro_list}")
    if not payload.cod_pro_list:
      return {"items": []}

    redis_key = dashboard_kpi_key(
        no_tarif=payload.no_tarif,
        cod_pro_list=payload.cod_pro_list
    )
    
    try:
        cached = await redis_client.get(redis_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] dashboard_kpi fallback")

    if not payload.cod_pro_list:
        return {"items": []}

    if len(payload.cod_pro_list) > 500:
        raise HTTPException(status_code=400, detail="Nombre maximum de produits autorisé : 500.")

    params = {"no_tarif": payload.no_tarif}
    placeholders = ", ".join([f":p{i}" for i in range(len(payload.cod_pro_list))])
    
    # CORRECTION: Ajouter marge_absolue pour calcul correct
    query = f"""
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        WITH produits AS (
            SELECT DISTINCT cod_pro, refint, no_tarif
            FROM CBM_DATA.Pricing.Dimensions_Produit WITH (NOLOCK)
            WHERE no_tarif = :no_tarif AND cod_pro IN ({placeholders})
        )
        SELECT p.cod_pro,
                p.refint, 
               COUNT(DISTINCT p.cod_pro) AS produits_actifs,
               ROUND(ISNULL(SUM(v.tot_vte_eur), 0), 2) AS ca_total,
               ROUND(ISNULL(SUM(v.tot_marge_pr_eur), 0), 2) AS marge_absolue,
               ISNULL(ROUND(CASE WHEN SUM(v.tot_vte_eur) = 0 THEN 0 ELSE SUM(v.tot_marge_pr_eur) / SUM(v.tot_vte_eur) END, 4), 0.0) AS marge_moyenne,
               COUNT(DISTINCT a.cod_pro) AS alertes_actives
        FROM produits p
        LEFT JOIN CBM_DATA.Pricing.Px_vte_mouvement v WITH (NOLOCK)
            ON v.cod_pro = p.cod_pro AND v.no_tarif = p.no_tarif
            AND v.dat_mvt >= DATEFROMPARTS(YEAR(DATEADD(month, -11, GETDATE())), MONTH(DATEADD(month, -11, GETDATE())), 1)
            AND v.type_prix_code = 3
        LEFT JOIN CBM_DATA.Pricing.vw_Alertes_Detaillees a WITH (NOLOCK)
            ON a.cod_pro = p.cod_pro AND a.no_tarif = p.no_tarif AND a.est_active = 1
        GROUP BY p.cod_pro, p.refint;
    """
    params.update({f"p{i}": cod for i, cod in enumerate(payload.cod_pro_list)})

    start = time.perf_counter()
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(f"[get_dashboard_kpi] {len(rows)} rows in {elapsed:.1f} ms")

    data = {
        "items": [
            {
                "cod_pro": row[0],
                "refint": row[1],
                "produits_actifs": row[2],
                "ca_total": row[3],
                "marge_absolue": row[4],  # NOUVEAU: marge absolue
                "marge_moyenne": row[5],  # marge relative par produit
                "alertes_actives": row[6],
            }
            for row in rows
        ]
    }

    try:
        await redis_client.set(redis_key, json.dumps(data), ex=REDIS_TTL_SHORT)
    except Exception:
        logger.exception("[Redis] dashboard_kpi set failed")

    return data


async def get_historique_prix_marge(payload: DashboardFilterRequest, db: AsyncSession):
    payload.cod_pro_list = await extract_cod_pro_list(payload, db)
    if not payload.cod_pro_list:
      return {"items": []}  # ou "rows": [] selon la fonction

    redis_key = dashboard_histo_key(no_tarif=payload.no_tarif, cod_pro_list=payload.cod_pro_list)
    
    try:
        cached = await redis_client.get(redis_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] histoprix fallback")

    cod_pro_list = payload.cod_pro_list
    if not cod_pro_list:
        return {"items": []}

    if len(cod_pro_list) > 500:
        raise HTTPException(400, "Trop de produits demandés.")

    params = {"no_tarif": payload.no_tarif}
    placeholders = ", ".join([f":p{i}" for i in range(len(cod_pro_list))])
    params.update({f"p{i}": cod for i, cod in enumerate(cod_pro_list)})

    query = f"""
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
    WITH produits AS (
        SELECT DISTINCT cod_pro, refint, qualite, famille, s_famille, no_tarif
        FROM CBM_DATA.Pricing.Dimensions_Produit WITH (NOLOCK)
        WHERE no_tarif = :no_tarif AND cod_pro IN ({placeholders})
    ),
    base_data AS (
        SELECT
            d.FirstOfMonth AS periode,
            p.cod_pro,
            mvt.tot_vte_eur,
            mvt.tot_marge_pr_eur, 
            mvt.qte
        FROM CBM_DATA.Pricing.Px_vte_mouvement mvt WITH (NOLOCK)
        INNER JOIN produits p ON p.cod_pro = mvt.cod_pro AND p.no_tarif = mvt.no_tarif
        INNER JOIN CBM_DATA.dm.Dim_Date d WITH (NOLOCK) ON mvt.dat_mvt = d.Date 
        WHERE mvt.[type_prix_code] = 3
        AND d.FirstOfMonth >= DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    ),
    last_12_months AS (
        SELECT DISTINCT TOP 12 periode
        FROM base_data
        ORDER BY periode DESC
    )
    SELECT
        CONVERT(varchar(7), b.periode, 120) AS periode,
        b.cod_pro,
        ISNULL(SUM(b.tot_vte_eur), 0) AS ca_mensuel,
        ISNULL(SUM(b.tot_marge_pr_eur), 0) AS marge_mensuelle, 
        ISNULL(SUM(b.qte), 0) AS qte_mensuelle, 
        ISNULL(ROUND(
                CASE 
                    WHEN SUM(b.tot_vte_eur) = 0 THEN 0
                    ELSE 100 * SUM(b.tot_marge_pr_eur) / NULLIF(SUM(b.tot_vte_eur), 0)
                END, 
            2), 0.0
         ) AS marge_mensuelle_pourcentage
    FROM base_data b
    JOIN last_12_months l ON b.periode = l.periode
    GROUP BY b.periode, b.cod_pro
    ORDER BY b.periode
    """

    start = time.perf_counter()
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(f"[get_historique_prix_marge] {len(rows)} rows in {elapsed:.1f} ms")

    data = [
        {
            "periode": row[0],
            "cod_pro": row[1],
            "ca_mensuel": row[2],
            "marge_mensuelle": row[3],
            "qte_mensuelle": row[4],
            "marge_mensuelle_pourcentage": row[5]
        }
        for row in rows
    ]

    try:
        await redis_client.set(redis_key, json.dumps(data), ex=REDIS_TTL_SHORT)
    except Exception:
        logger.exception("[Redis] histoprix set failed")

    return data

async def get_dashboard_products(
    payload: DashboardFilterRequest,
    db: AsyncSession,
    page: int = 0,
    limit: int = 100,
):
    payload.cod_pro_list = await extract_cod_pro_list(payload, db)
    if not payload.cod_pro_list:
        return {"total": 0, "rows": []}

    redis_key = dashboard_products_key(payload.model_dump(), page, limit)

    try:
        cached = await redis_client.get(redis_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] dashboard_products fallback")

    cod_pro_list = payload.cod_pro_list
    if not cod_pro_list:
        return {"total": 0, "rows": []}

    if len(cod_pro_list) > 1000:
        raise HTTPException(400, "Trop de produits demandés.")

    limit = max(min(limit, 400), 10)
    offset = max(page, 0) * limit

    count_query = """
        SELECT COUNT(DISTINCT cod_pro)
        FROM CBM_DATA.Pricing.Dimensions_Produit WITH (NOLOCK)
        WHERE no_tarif = :no_tarif
    """
    count_params = {"no_tarif": payload.no_tarif}
    placeholders = ", ".join([f":p{i}" for i in range(len(cod_pro_list))])
    count_query += f" AND cod_pro IN ({placeholders})"
    count_params.update({f"p{i}": cod for i, cod in enumerate(cod_pro_list)})

    result_count = await db.execute(text(count_query), count_params)
    totalRowCount = result_count.scalar() or 0

    query = f"""
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        WITH produits AS (
            SELECT DISTINCT cod_pro, refint, qualite, statut, famille, s_famille, no_tarif
            FROM CBM_DATA.Pricing.Dimensions_Produit WITH (NOLOCK)
            WHERE no_tarif = :no_tarif AND cod_pro IN ({placeholders})
        ),
        mvt_main AS (
            SELECT cod_pro, no_tarif,
                   SUM(tot_vte_eur) AS ca_total,
                   SUM(tot_marge_pr_eur) AS marge_total,
                   SUM(qte) AS qte
            FROM CBM_DATA.Pricing.Px_vte_mouvement WITH (NOLOCK)
            WHERE dat_mvt >= DATEFROMPARTS(YEAR(DATEADD(month, -11, GETDATE())), MONTH(DATEADD(month, -11, GETDATE())), 1)
            AND type_prix_code = 3
            GROUP BY cod_pro, no_tarif
        ),
        mvt_le_mans AS (
            SELECT cod_pro,
                   SUM(tot_vte_eur) AS ca_total_le_mans,
                   SUM(tot_marge_pr_eur) AS marge_total_le_mans,
                   SUM(qte) AS qte_le_mans
            FROM CBM_DATA.Pricing.Px_vte_mouvement WITH (NOLOCK)
            WHERE dat_mvt >= DATEADD(YEAR, -1, GETDATE())
              AND ndos = 918
            GROUP BY cod_pro
        )
        SELECT d.cod_pro, d.refint, CAST(d.famille AS VARCHAR), CAST(d.s_famille AS VARCHAR), d.qualite, d.statut, 
               ISNULL(pvte.px_refv_eur, 0) AS px_vente,
               ISNULL(pxa.px_net_eur, 0) AS px_achat,
               ISNULL(100 * CASE WHEN ISNULL(pvte.px_refv_eur, 0) = 0 THEN 0
                   ELSE (ISNULL(pvte.px_refv_eur, 0) - ISNULL(pxa.px_net_eur, 0)) / NULLIF(pvte.px_refv_eur,0) END,0) AS taux_marge_px,
               ISNULL(mvt.ca_total, 0),
               ISNULL(mvt.marge_total, 0),
               ISNULL(mvt.qte, 0),
               ISNULL(ROUND(100 * CASE WHEN ISNULL(mvt.ca_total,0)=0 THEN 0 ELSE mvt.marge_total / NULLIF(mvt.ca_total,0) END,2),0) AS taux_marge,
               ISNULL(mvt_le_mans.ca_total_le_mans, 0),
               ISNULL(mvt_le_mans.marge_total_le_mans, 0),
               ISNULL(mvt_le_mans.qte_le_mans, 0),
               ISNULL(ROUND(100 * CASE WHEN ISNULL(mvt_le_mans.ca_total_le_mans,0)=0 THEN 0 ELSE mvt_le_mans.marge_total_le_mans / NULLIF(mvt_le_mans.ca_total_le_mans,0) END,2),0) AS taux_marge_le_mans,
               ISNULL(st.stock_le_mans, 0),
               ISNULL(st.pmp_le_mans, 0)
        FROM produits d
        LEFT JOIN CBM_DATA.Pricing.Px_vte_tarif_actuel pvte WITH (NOLOCK)
            ON d.cod_pro = pvte.cod_pro AND d.no_tarif = pvte.no_tarif
        LEFT JOIN CBM_DATA.Pricing.Px_achat_net pxa WITH (NOLOCK)
            ON d.cod_pro = pxa.cod_pro
        LEFT JOIN (SELECT cod_pro, SUM(stock) as stock_le_mans, MAX(pmp_eur) as pmp_le_mans FROM CBM_DATA.stock.Fact_Stock_Actuel WITH (NOLOCK) WHERE depot = 1 GROUP BY cod_pro) st
            ON d.cod_pro = st.cod_pro
        LEFT JOIN mvt_main mvt
            ON d.cod_pro = mvt.cod_pro AND d.no_tarif = mvt.no_tarif
        LEFT JOIN mvt_le_mans 
            ON d.cod_pro = mvt_le_mans.cod_pro
        ORDER BY CASE WHEN qualite = 'OE' THEN 1 WHEN qualite = 'OEM' THEN 2 ELSE 3 END, ISNULL(pvte.px_refv_eur, 0) DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY;
    """

    params = {"no_tarif": payload.no_tarif, "offset": offset, "limit": limit}
    params.update({f"p{i}": cod for i, cod in enumerate(cod_pro_list)})

    start = time.perf_counter()
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(f"[get_dashboard_products] {len(rows)} produits chargés en {elapsed:.1f} ms")

    data = {
        "total": totalRowCount,
        "rows": [
            {
                "cod_pro": r[0], "refint": r[1], "famille": r[2], "s_famille": r[3], "qualite": r[4], "statut": r[5],
                "px_vente": r[6], "px_achat": r[7], "taux_marge_px": r[8],
                "ca_total": r[9], "marge_total": r[10], "qte": r[11], "taux_marge": r[12],
                "ca_total_le_mans": r[13], "marge_total_le_mans": r[14],
                "qte_le_mans": r[15], "taux_marge_le_mans": r[16], "stock_le_mans": r[17], "pmp_le_mans": r[18]
            }

            for r in rows
        ]
    }

    try:
        await redis_client.set(redis_key, json.dumps(data), ex=REDIS_TTL_SHORT)
    except Exception:
        logger.exception("[Redis] dashboard_products set failed")

    return data
