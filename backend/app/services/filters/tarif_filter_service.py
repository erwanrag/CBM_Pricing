# services/filters/tarif_filter_service.py

from sqlalchemy.orm import Query
from app.common.redis_client import redis_client

def apply_tarif_filter(query: Query, model_alias, no_tarif: int | None = None):
    """
    Filtre générique sur le champ no_tarif si fourni.
    À utiliser dans les services catalogue, comparatif, etc.
    """
    if no_tarif:
        query = query.filter(model_alias.no_tarif == no_tarif)
    return query
