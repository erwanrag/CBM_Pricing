# services/filters/product_identifier_filter_service.py
from typing import Union
from sqlalchemy.orm import Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.produits.identifier_schema import ProductIdentifierRequest
from app.services.produits.identifier_service import get_codpro_list_from_identifier
from app.common.redis_client import redis_client
from app.cache.cache_keys import resolve_codpro_key
from app.common.constants import REDIS_TTL_SHORT
from app.common.logger import logger
import json
from app.schemas.dashboard.dashboard_schema import DashboardFilterRequest
from app.schemas.alertes.alertes_schema import AlertesSummaryRequest

async def resolve_cod_pro_list(payload: ProductIdentifierRequest, db: AsyncSession) -> list[int]:
    redis_key = resolve_codpro_key(**payload.model_dump())
    try:
        cached = await redis_client.get(redis_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.exception("[Redis] resolve_cod_pro_list fallback")
    result = await get_codpro_list_from_identifier(payload, db)
    try:
        await redis_client.set(redis_key, json.dumps(result), ex=REDIS_TTL_SHORT)
    except Exception:
        logger.exception("[Redis] resolve_cod_pro_list set failed")
    return result

def apply_product_filters(query: Query, model_alias, cod_pro_list: list[int] | None = None):
    if cod_pro_list:
        query = query.filter(model_alias.cod_pro.in_(cod_pro_list))
    return query

async def extract_cod_pro_list(payload, db):
    cod_pro = getattr(payload, "cod_pro", None)
    ref_crn = getattr(payload, "ref_crn", None)
    refint = getattr(payload, "refint", None)
    grouping_crn = getattr(payload, "grouping_crn", None)

    
    # VALIDATION STRICTE : Ne retourne une liste QUE si au moins un filtre produit est ACTIF !
    has_cod_pro = cod_pro not in [None, "", 0, "0"]
    has_ref_crn = ref_crn not in [None, "", 0, "0"]
    has_refint = refint not in [None, "", 0, "0"]
    has_grouping = grouping_crn not in [None, 0, "0", ""]
    
    if not (has_cod_pro or has_ref_crn or has_refint or has_grouping):

        return None
    
    # Si une liste est déjà présente, l'utiliser
    if hasattr(payload, "cod_pro_list") and payload.cod_pro_list:
        return payload.cod_pro_list
    
    # Cas spécial : force_single
    if cod_pro and getattr(payload, "force_single", False):
        return [cod_pro]
    
    # Résolution via identifier service
    identifier_payload = ProductIdentifierRequest(
        cod_pro=cod_pro,
        ref_crn=ref_crn,
        refint=refint,
        grouping_crn=grouping_crn,
        qualite=getattr(payload, "qualite", None)
    )
    
    resolved = await resolve_cod_pro_list(identifier_payload, db)
    
    # PROTECTION SUPPLÉMENTAIRE : Si la résolution retourne trop de résultats, 
    # c'est probablement parce qu'aucun filtre n'était vraiment actif
    if resolved and len(resolved) > 50000:  # Seuil de sécurité
        return None
    
    if getattr(payload, "force_single", False) and resolved:
        return [resolved[0]]
    
    return resolved
