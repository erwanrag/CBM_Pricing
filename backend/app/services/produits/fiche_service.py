# services/produits/fiche_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.common.redis_client import redis_client
from app.cache.cache_keys import fiche_key
from fastapi import HTTPException
import json
from app.common.logger import logger
from app.common.constants import REDIS_TTL_MEDIUM

async def fetch_product_fiche(no_tarif: int, cod_pro: int, db: AsyncSession):
    redis_key = fiche_key(no_tarif, cod_pro)
    try:
        cached = await redis_client.get(redis_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] fiche fallback")

    query = """
        EXEC [Pricing].[sp_Get_Analyse_Product]
            @no_tarif = :no_tarif,
            @cod_pro = :cod_pro
    """
    try:
        result = await db.execute(text(query), {"no_tarif": no_tarif, "cod_pro": cod_pro})
        rows = result.mappings().all()
        data = [dict(r) for r in rows]
        try:
            await redis_client.set(redis_key, json.dumps(data), ex=REDIS_TTL_MEDIUM)
        except Exception:
            logger.exception("[Redis] fiche set failed")
        return data
    except Exception:
        logger.exception("[SQL] Erreur lors de la récupération de la fiche produit")
        raise HTTPException(status_code=500, detail="Erreur SQL")

