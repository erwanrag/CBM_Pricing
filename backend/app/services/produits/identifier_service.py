# services/produits/identifier_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.common.redis_client import redis_client
from app.cache.cache_keys import resolve_codpro_key
from app.schemas.produits.identifier_schema import ProductIdentifierRequest
from app.common.constants import REDIS_TTL_SHORT
from app.common.logger import logger
import json

async def get_codpro_list_from_identifier(payload: ProductIdentifierRequest, db: AsyncSession):
    redis_key = resolve_codpro_key(**payload.model_dump())
    try:
        cached = await redis_client.get(redis_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] fallback get_codpro_list_from_identifier")

    if payload.grouping_crn == 1 and payload.cod_pro:
        result = await db.execute(text("""
            SELECT TOP 1 grouping_crn
            FROM CBM_DATA.Pricing.Dimensions_Produit
            WHERE cod_pro = :cod_pro
        """), {"cod_pro": payload.cod_pro})
        row = result.fetchone()
        if not row or not row[0]:
            return [payload.cod_pro]
        type_cle = 0
        valeur_crn = row[0]

    elif payload.cod_pro and payload.ref_crn:
        type_cle = 1
        valeur_crn = payload.ref_crn

    elif payload.ref_crn:
        type_cle = 1
        valeur_crn = payload.ref_crn

    elif payload.grouping_crn == 1 and payload.ref_crn:
        result = await db.execute(text("""
            SELECT TOP 1 grouping_crn
            FROM CBM_DATA.Pricing.Dimensions_Produit
            WHERE ref_crn = :ref_crn
        """), {"ref_crn": payload.ref_crn})
        row = result.fetchone()
        if not row or not row[0]:
            return []
        type_cle = 0
        valeur_crn = row[0]

    else:
        return [payload.cod_pro] if payload.cod_pro else []

    proc = text("""
        EXEC Pricing.sp_Get_CodPro_From_Cle
            @type_cle = :type_cle,
            @valeur_crn = :valeur_crn,
            @qualite = :qualite
    """)
    result = await db.execute(proc, {
        "type_cle": type_cle,
        "valeur_crn": valeur_crn,
        "qualite": payload.qualite
    })
    rows = result.fetchall()
    resolved = [row[0] for row in rows] or ([payload.cod_pro] if payload.cod_pro else [])

    # LOG ICI : combien de codes résolus et le détail du payload
    #logger.warning(f"[get_codpro_list_from_identifier] Résolu {len(resolved)} codes | payload={payload.model_dump()}")

    try:
        await redis_client.set(redis_key, json.dumps(resolved), ex=REDIS_TTL_SHORT)
    except Exception:
        logger.exception("[Redis] set failed get_codpro_list_from_identifier")

    return resolved
