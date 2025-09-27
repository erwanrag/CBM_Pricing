# backend/app/services/parametres/parametres_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.schemas.parametres.parametres_schema import TarifParam
from app.common.redis_client import redis_client
from app.cache.cache_keys import parametres_tarifs_key
from typing import List
from aiocache import cached, Cache

import json
from app.common.constants import REDIS_TTL_SHORT
from app.common.logger import logger

async def get_all_tarifs(db: AsyncSession):
    redis_key = parametres_tarifs_key()
    try:
        cached = await redis_client.get(redis_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] get_all_tarifs fallback")

    query = text("""
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        SELECT no_tarif, nom_tarif, visible
        FROM CBM_DATA.dm.Dim_Tarif WITH (NOLOCK)
        ORDER BY no_tarif
    """)
    result = await db.execute(query)
    rows = [dict(row) for row in result.mappings().all()]

    try:
        await redis_client.set(redis_key, json.dumps(rows), ex=REDIS_TTL_SHORT)
    except Exception:
        logger.exception("[Redis] set failed get_all_tarifs")

    return rows

async def update_tarif_visibility(payload: List[TarifParam], db: AsyncSession):
    for param in payload:
        await db.execute(text("""
            UPDATE CBM_DATA.dm.Dim_Tarif
            SET visible = :visible
            WHERE no_tarif = :no_tarif
        """), {
            "no_tarif": param.no_tarif,
            "visible": param.visible
        })
    await db.commit()

    # ❗Purge du cache
    try:
        await redis_client.delete("parametres:tarifs")
    except Exception:
        logger.exception("[Redis] delete failed after update_tarif_visibility")

    return {"message": "Visibilité des tarifs mise à jour avec succès."}
