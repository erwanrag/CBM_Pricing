# app/services/tarifs/comparatif_multi_service.py
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc, text, and_, or_
from fastapi import HTTPException
from app.models.comparatif_tarif import ComparatifTarifPivot
from app.schemas.tarifs.comparatif_multi_schema import ComparatifFilterRequest
from app.common.redis_client import redis_client
from app.cache.cache_keys import comparatif_multi_key
from app.common.constants import REDIS_TTL_MEDIUM
from app.common.logger import logger
import json
from decimal import Decimal

# Configuration pour optimiser les performances sans index
INITIAL_PREFETCH_SIZE = 500  # Précharger 500 lignes
MAX_TOTAL_WITHOUT_FILTER = 1000  # Limiter à 1000 sans filtre pour éviter timeout
CACHE_TTL_LONG = 300  # 5 minutes pour les gros datasets

def normalize(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: normalize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [normalize(v) for v in obj]
    return obj

def build_tarif_conditions(tarifs: list) -> list:
    """Construction des conditions de filtrage par tarifs"""
    conditions = []
    for t in tarifs:
        conditions.append(text(f"prix_{t} IS NOT NULL AND prix_{t} > 0"))
    return conditions

def has_specific_filters(payload: ComparatifFilterRequest) -> bool:
    """Vérifie si des filtres spécifiques sont appliqués"""
    return any([payload.cod_pro, payload.refint, payload.qualite])

async def get_cached_or_compute(
    cache_key: str, 
    compute_func, 
    ttl: int = REDIS_TTL_MEDIUM
) -> Dict[str, Any]:
    """Récupération avec cache Redis optimisé"""
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            logger.info(f"Cache hit: {cache_key}")
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Erreur lecture cache: {e}")
    
    # Calcul si pas en cache
    result = await compute_func()
    
    # Mise en cache
    try:
        await redis_client.set(cache_key, json.dumps(result), ex=ttl)
        logger.info(f"Cache mis à jour: {cache_key}")
    except Exception as e:
        logger.warning(f"Erreur cache: {e}")
    
    return result

async def get_comparatif_multi(db: AsyncSession, payload: ComparatifFilterRequest) -> Dict[str, Any]:
    tarifs = payload.tarifs
    is_export = getattr(payload, "export_all", False)
    has_filters = has_specific_filters(payload)

    if not (1 <= len(tarifs) <= 3):
        raise ValueError("Entre 1 et 3 tarifs requis.")

    # Gestion pagination intelligente
    if is_export:
        page, offset, limit = 1, 0, 999_999
    else:
        page = max(payload.page, 1)
        # Préchargement intelligent
        if page == 1 and not has_filters:
            limit = INITIAL_PREFETCH_SIZE
        else:
            limit = payload.limit
        offset = (page - 1) * limit

    sort_field = payload.sort_by or "cod_pro"
    sort_dir = payload.sort_dir.lower() if payload.sort_dir else "asc"

    # Clé de cache stratifiée
    cache_key_base = comparatif_multi_key(**payload.model_dump())
    count_cache_key = f"{cache_key_base}:count"
    
    async def compute_total():
        """Calcul du total avec la même logique que la requête principale"""
        try:
            # Utiliser la même logique de filtrage que pour la requête principale
            count_where_conditions = []
            
            # Condition tarifs obligatoire (identique à la requête principale)
            tarif_condition = " OR ".join([f"prix_{t} IS NOT NULL AND prix_{t} > 0" for t in tarifs])
            count_where_conditions.append(f"({tarif_condition})")
            
            # Filtres optionnels (identiques)
            if payload.cod_pro:
                count_where_conditions.append(f"cod_pro = {payload.cod_pro}")
            
            if payload.refint:
                count_where_conditions.append(f"refint LIKE '%{payload.refint}%'")
            
            if payload.qualite:
                count_where_conditions.append(f"qualite = '{payload.qualite}'")
            
            # Pas de limitation - même logique que requête principale
            count_where_clause = " AND ".join(count_where_conditions)
            
            # Requête COUNT avec SQL brut
            count_sql = f"""
            SELECT COUNT(*) as total
            FROM [CBM_DATA].[Pricing].[Comparatif_Tarif_Pivot]
            WHERE {count_where_clause}
            """
            
            logger.info(f"SQL count: {count_sql}")
            
            result = await db.execute(text(count_sql))
            row = result.fetchone()
            total = row[0] if row else 0
                
            logger.info(f"Total réel calculé: {total} (filtres: {has_filters})")
            return total
        except Exception as e:
            logger.error(f"Erreur calcul total: {e}")
            return 0

    # Récupération du total avec cache
    total = await get_cached_or_compute(count_cache_key, compute_total)

    # Construction de la requête de données
    valid_base_fields = {
        'cod_pro', 'refint', 'nom_pro', 'qualite', 'statut', 'prix_achat',
        'stock_LM', 'pmp_LM', 'qte_LM', 'ca_LM', 'marge_LM'
    }
    
    valid_tarif_fields = set()
    tarif_columns = []
    for t in tarifs:
        fields = [f'prix_{t}', f'marge_{t}', f'qte_{t}', f'ca_{t}', f'marge_realisee_{t}']
        valid_tarif_fields.update(fields)
        tarif_columns.extend([text(field) for field in fields])
    
    valid_sort_fields = valid_base_fields | valid_tarif_fields
    if len(tarifs) >= 2:
        valid_sort_fields.add('ratio_max_min')

    # Gestion du tri
    if sort_field in valid_base_fields:
        order_col = getattr(ComparatifTarifPivot, sort_field)
    elif sort_field in valid_tarif_fields:
        order_col = text(sort_field)
    elif sort_field == 'ratio_max_min' and len(tarifs) >= 2:
        order_col = ComparatifTarifPivot.cod_pro  # Tri côté application
    else:
        logger.warning(f"Champ tri invalide: {sort_field}")
        order_col = ComparatifTarifPivot.cod_pro

    order_col = desc(order_col) if sort_dir == "desc" else asc(order_col)

    # Requête finale avec SQL brut pour gérer les colonnes dynamiques
    try:
        # Construction de la liste des colonnes avec SQL brut
        base_columns = [
            "cod_pro", "refint", "nom_pro", "qualite", "statut", "prix_achat",
            "stock_LM", "pmp_LM", "qte_LM", "ca_LM", "marge_LM"
        ]
        
        tarif_columns_sql = []
        for t in tarifs:
            tarif_columns_sql.extend([
                f"prix_{t}", f"marge_{t}", f"qte_{t}", 
                f"ca_{t}", f"marge_realisee_{t}"
            ])
        
        all_columns = base_columns + tarif_columns_sql
        columns_sql = ", ".join([f'"{col}"' for col in all_columns])
        
        # Construction des conditions WHERE
        where_conditions = []
        
        # Condition tarifs obligatoire
        tarif_condition = " OR ".join([f"prix_{t} IS NOT NULL AND prix_{t} > 0" for t in tarifs])
        where_conditions.append(f"({tarif_condition})")
        
        # Filtres optionnels
        if payload.cod_pro:
            where_conditions.append(f"cod_pro = {payload.cod_pro}")
        
        if payload.refint:
            where_conditions.append(f"refint LIKE '%{payload.refint}%'")
        
        if payload.qualite:
            where_conditions.append(f"qualite = '{payload.qualite}'")
        
        where_clause = " AND ".join(where_conditions)
        
        logger.info(f"WHERE clause SQL: {where_clause}")
        
        # Tri par défaut : ratio si >= 2 tarifs, sinon cod_pro
        if sort_field in base_columns or sort_field in tarif_columns_sql:
            order_clause = f"ORDER BY {sort_field} {sort_dir.upper()}"
        elif sort_field == "ratio_max_min" and len(tarifs) >= 2:
            # Tri par ratio calculé côté application - utiliser cod_pro temporairement
            order_clause = "ORDER BY cod_pro ASC"
        else:
            # Tri par défaut selon le nombre de tarifs
            if len(tarifs) >= 2:
                # Multi-tarifs : tri par cod_pro puis tri par ratio côté application
                order_clause = "ORDER BY cod_pro ASC"
            else:
                # Mono-tarif : tri par cod_pro
                order_clause = "ORDER BY cod_pro ASC"
        
        # Requête SQL brute complète
        raw_sql = f"""
        SELECT {columns_sql}
        FROM [CBM_DATA].[Pricing].[Comparatif_Tarif_Pivot]
        WHERE {where_clause}
        {order_clause}
        OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY
        """
        
        logger.info(f"Exécution requête SQL brute: page={page}, limit={limit}, offset={offset}")
        logger.info(f"SQL généré: {raw_sql[:200]}...")
        
        result = await db.execute(text(raw_sql))
        rows = result.fetchall()
        
        logger.info(f"Récupéré {len(rows)} lignes")
        
        # Debug: vérifier les colonnes
        if rows:
            first_row = rows[0]
            available_columns = list(first_row._mapping.keys()) if hasattr(first_row, '_mapping') else list(first_row.keys())
            logger.info(f"Colonnes SQL brut: {available_columns}")
        
    except Exception as e:
        logger.error(f"Erreur requête SQL brute: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur requête: {str(e)}")

    # Construction de la réponse avec gestion des colonnes dynamiques
    result_rows = []
    for row in rows:
        try:
            # Accès correct aux colonnes SQLAlchemy Row
            if hasattr(row, '_mapping'):
                row_data = row._mapping
            else:
                # Fallback pour anciennes versions
                row_data = {column: getattr(row, column) for column in row.keys()}
            
            item = {
                "cod_pro": row_data.get('cod_pro'),
                "refint": row_data.get('refint', ''),
                "nom_pro": row_data.get('nom_pro', ''),
                "qualite": row_data.get('qualite', ''),
                "statut": row_data.get('statut', 0),
                "prix_achat": row_data.get('prix_achat'),
                "pmp_LM": row_data.get('pmp_LM'),
                "stock_LM": int(row_data.get('stock_LM')) if row_data.get('stock_LM') is not None else None,
                "ca_LM": row_data.get('ca_LM'),
                "qte_LM": int(row_data.get('qte_LM')) if row_data.get('qte_LM') is not None else None,
                "marge_LM": row_data.get('marge_LM'),
                "tarifs": {}
            }

            # Récupération des données tarifs depuis les colonnes avec debug
            prix_list = []
            for t in tarifs:
                prix = row_data.get(f'prix_{t}')
                marge = row_data.get(f'marge_{t}')
                qte = row_data.get(f'qte_{t}')
                ca = row_data.get(f'ca_{t}')
                marge_realisee = row_data.get(f'marge_realisee_{t}')
                
                # Debug pour le produit 511
                if row_data.get('cod_pro') == 511:
                    logger.info(f"Produit 511 - Tarif {t}: prix={prix}, marge={marge}")
                
                item["tarifs"][str(t)] = {
                    "prix": prix,
                    "marge": marge,
                    "qte": int(qte) if qte is not None else None,
                    "ca": ca,
                    "marge_realisee": marge_realisee,
                }
                
                if prix is not None and prix > 0:
                    prix_list.append(float(prix))
            
        except Exception as e:
            logger.error(f"Erreur accès données ligne {getattr(row, 'cod_pro', 'unknown')}: {e}")
            continue  # Skip cette ligne en cas d'erreur

        # Calcul ratio prix max/min
        if len(prix_list) >= 2:
            min_prix, max_prix = min(prix_list), max(prix_list)
            item["ratio_max_min"] = round(max_prix / min_prix, 2) if min_prix > 0 else None
        else:
            item["ratio_max_min"] = None

        result_rows.append(item)

    # Tri côté application pour ratio si nécessaire
    if sort_field == "ratio_max_min" and len(tarifs) >= 2:
        reverse_sort = sort_dir == "desc"
        result_rows.sort(
            key=lambda x: x["ratio_max_min"] if x["ratio_max_min"] is not None else 0,
            reverse=reverse_sort
        )
    elif len(tarifs) >= 2 and (sort_field == "cod_pro" or sort_field not in base_columns + tarif_columns_sql):
        # Tri par défaut par ratio DESC pour multi-tarifs
        result_rows.sort(
            key=lambda x: x["ratio_max_min"] if x["ratio_max_min"] is not None else 0,
            reverse=True  # DESC par défaut pour ratio
        )

    response = {
        "total": total,
        "rows": result_rows,
        # Métadonnées pour le frontend
        "meta": {
            "has_more": total > offset + len(result_rows),
            "prefetch_size": INITIAL_PREFETCH_SIZE if page == 1 and not has_filters else limit,
            "performance_mode": not has_filters,
            "cached": False  # Sera True si vient du cache
        }
    }
    
    response = normalize(response)

    # Cache avec TTL adaptatif
    cache_ttl = CACHE_TTL_LONG if not has_filters else REDIS_TTL_MEDIUM
    try:
        await redis_client.set(cache_key_base, json.dumps(response), ex=cache_ttl)
        logger.info(f"Réponse mise en cache (TTL: {cache_ttl}s)")
    except Exception as e:
        logger.warning(f"Erreur cache réponse: {e}")

    return response