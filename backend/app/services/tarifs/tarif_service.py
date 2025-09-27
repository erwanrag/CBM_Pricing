# services/tarifs/tarif_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.common.redis_client import redis_client
from app.cache.cache_keys import tarif_filter_options_key
from app.common.constants import REDIS_TTL_MEDIUM
from app.common.logger import logger
import json


async def get_tarif_filter_options(db: AsyncSession):
    redis_key = tarif_filter_options_key()
    try:
        cached = await redis_client.get(redis_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] get_tarif_filter_options fallback")

    query = """
    SELECT 
        no_tarif,
        CONCAT(CAST(no_tarif AS VARCHAR), ' - ', nom_tarif) AS lib_tarif
    FROM CBM_DATA.dm.Dim_Tarif
    WHERE visible = 1
    ORDER BY no_tarif
    """
    result = await db.execute(text(query))
    rows = result.fetchall()
    data = [{"no_tarif": row.no_tarif, "lib_tarif": row.lib_tarif} for row in rows]

    try:
        await redis_client.set(redis_key, json.dumps(data), ex=REDIS_TTL_MEDIUM)
    except Exception:
        logger.exception("[Redis] set failed get_tarif_filter_options")

    return data

