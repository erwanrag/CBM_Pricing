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

# Configuration pour optimiser les performances
CACHE_TTL_LONG = 300  # 5 minutes pour les gros datasets

def normalize(obj):
    """Normalisation des Decimal en float pour JSON"""
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
    """
    Service principal de comparaison tarifaire multi
    Gère la pagination et le tri côté serveur sur toutes les données
    """
    tarifs = payload.tarifs
    is_export = getattr(payload, "export_all", False)
    has_filters = has_specific_filters(payload)

    if not (1 <= len(tarifs) <= 3):
        raise ValueError("Entre 1 et 3 tarifs requis.")

    # Gestion pagination
    if is_export:
        page, offset, limit = 1, 0, 999_999
    else:
        page = max(payload.page, 1)
        limit = payload.limit  # Respecter la limite demandée par le frontend
        offset = (page - 1) * limit

    sort_field = payload.sort_by or "cod_pro"
    sort_dir = payload.sort_dir.lower() if payload.sort_dir else "asc"

    # Clé de cache stratifiée
    cache_key_base = comparatif_multi_key(**payload.model_dump())
    count_cache_key = f"{cache_key_base}:count"
    
    async def compute_total():
        """Calcul du total avec la même logique que la requête principale"""
        try:
            count_where_conditions = []
            
            # Condition tarifs obligatoire
            tarif_condition = " OR ".join([f"prix_{t} IS NOT NULL AND prix_{t} > 0" for t in tarifs])
            count_where_conditions.append(f"({tarif_condition})")
            
            # Filtres optionnels
            if payload.cod_pro:
                count_where_conditions.append(f"cod_pro = {payload.cod_pro}")
            
            if payload.refint:
                count_where_conditions.append(f"refint LIKE '%{payload.refint}%'")
            
            if payload.qualite:
                count_where_conditions.append(f"qualite = '{payload.qualite}'")
            
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
                
            logger.info(f"Total calculé: {total} (filtres: {has_filters})")
            return total
        except Exception as e:
            logger.error(f"Erreur calcul total: {e}")
            return 0

    # Récupération du total avec cache
    total = await get_cached_or_compute(count_cache_key, compute_total)

    # Construction de la requête de données
    try:
        # Colonnes de base
        base_columns = [
            "cod_pro", "refint", "nom_pro", "qualite", "statut", "prix_achat",
            "stock_LM", "pmp_LM", "qte_LM", "ca_LM", "marge_LM"
        ]
        
        # Colonnes tarifs
        tarif_columns_sql = []
        prix_columns_for_ratio = []
        
        for t in tarifs:
            tarif_columns_sql.extend([
                f"prix_{t}", f"marge_{t}", f"qte_{t}", 
                f"ca_{t}", f"marge_realisee_{t}"
            ])
            prix_columns_for_ratio.append(f"prix_{t}")
        
        # Construction de la liste des colonnes avec calcul du ratio si nécessaire
        all_columns = base_columns + tarif_columns_sql
        columns_sql = ", ".join([f'"{col}"' for col in all_columns])
        
        # Ajout du calcul du ratio pour 2+ tarifs (SQL Server)
        if len(tarifs) >= 2:
            if len(prix_columns_for_ratio) == 2:
                # Pour 2 tarifs
                ratio_calc = f"""
                , CASE 
                    WHEN {prix_columns_for_ratio[0]} > 0 AND {prix_columns_for_ratio[1]} > 0
                    THEN CASE 
                        WHEN {prix_columns_for_ratio[0]} >= {prix_columns_for_ratio[1]} 
                        THEN CAST({prix_columns_for_ratio[0]} AS FLOAT) / {prix_columns_for_ratio[1]}
                        ELSE CAST({prix_columns_for_ratio[1]} AS FLOAT) / {prix_columns_for_ratio[0]}
                    END
                    ELSE NULL
                END AS ratio_max_min
                """
            else:
                # Pour 3 tarifs - calcul du max/min parmi les 3
                ratio_calc = f"""
                , CASE 
                    WHEN {' AND '.join([f'{col} > 0' for col in prix_columns_for_ratio])}
                    THEN (
                        SELECT CAST(MAX(v) AS FLOAT) / NULLIF(MIN(v), 0)
                        FROM (VALUES ({prix_columns_for_ratio[0]}), ({prix_columns_for_ratio[1]}), ({prix_columns_for_ratio[2]})) AS t(v)
                        WHERE v > 0
                    )
                    ELSE NULL
                END AS ratio_max_min
                """
            columns_sql += ratio_calc
        
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
        
        # Gestion du tri - TOUS les tris se font côté SQL
        valid_sort_fields = set(base_columns + tarif_columns_sql)
        if len(tarifs) >= 2:
            valid_sort_fields.add('ratio_max_min')
        
        if sort_field == "ratio_max_min" and len(tarifs) >= 2:
            # Tri par le ratio calculé en SQL
            order_clause = f"ORDER BY ratio_max_min {sort_dir.upper()}"
        elif sort_field in valid_sort_fields:
            order_clause = f"ORDER BY {sort_field} {sort_dir.upper()}"
        else:
            # Tri par défaut
            if len(tarifs) >= 2:
                order_clause = "ORDER BY ratio_max_min DESC"
            else:
                order_clause = "ORDER BY cod_pro ASC"
        
        # Requête SQL brute complète avec pagination
        raw_sql = f"""
        SELECT {columns_sql}
        FROM [CBM_DATA].[Pricing].[Comparatif_Tarif_Pivot]
        WHERE {where_clause}
        {order_clause}
        OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY
        """
        
        logger.info(f"Exécution requête SQL: page={page}, limit={limit}, offset={offset}")
        logger.debug(f"SQL généré: {raw_sql[:500]}...")
        
        result = await db.execute(text(raw_sql))
        rows = result.fetchall()
        
        logger.info(f"Récupéré {len(rows)} lignes sur {total} total")
        
    except Exception as e:
        logger.error(f"Erreur requête SQL: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur requête: {str(e)}")

    # Construction de la réponse
    result_rows = []
    for row in rows:
        try:
            # Accès aux colonnes SQLAlchemy Row
            if hasattr(row, '_mapping'):
                row_data = row._mapping
            else:
                row_data = {column: getattr(row, column) for column in row.keys()}
            
            # Construction de l'item de base
            item = {
                "cod_pro": row_data.get('cod_pro'),
                "refint": row_data.get('refint', ''),
                "nom_pro": row_data.get('nom_pro', ''),
                "qualite": row_data.get('qualite', ''),
                "statut": row_data.get('statut', 0),
                "prix_achat": row_data.get('prix_achat'),
                "pmp_LM": row_data.get('pmp_LM'),
                "stock_LM": row_data.get('stock_LM'),
                "ca_LM": row_data.get('ca_LM'),
                "qte_LM": row_data.get('qte_LM'),
                "marge_LM": row_data.get('marge_LM'),
                "tarifs": {}
            }

            # Ajout des données par tarif
            for t in tarifs:
                tarif_data = {
                    "prix": row_data.get(f'prix_{t}'),
                    "marge": row_data.get(f'marge_{t}'),
                    "qte": row_data.get(f'qte_{t}'),
                    "ca": row_data.get(f'ca_{t}'),
                    "marge_realisee": row_data.get(f'marge_realisee_{t}')
                }
                item["tarifs"][str(t)] = tarif_data
                
                # Debug pour vérifier les données
                #if tarif_data.get("prix"):
                #    logger.debug(f"Produit {item['cod_pro']} - Tarif {t}: prix={tarif_data['prix']}, marge={tarif_data.get('marge')}")

            # Ajout du ratio si calculé
            if len(tarifs) >= 2:
                item["ratio_max_min"] = row_data.get('ratio_max_min')

            result_rows.append(item)
            
        except Exception as e:
            logger.error(f"Erreur traitement ligne: {e}")
            continue

    # Construction de la réponse finale
    response = {
        "total": total,
        "rows": result_rows,
        "meta": {
            "has_more": total > offset + len(result_rows),
            "page": page,
            "page_size": limit,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1,
            "performance_mode": not has_filters,
            "cached": False
        }
    }
    
    # Normalisation pour JSON
    response = normalize(response)

    # Cache avec TTL adaptatif
    cache_ttl = CACHE_TTL_LONG if not has_filters else REDIS_TTL_MEDIUM
    try:
        await redis_client.set(cache_key_base, json.dumps(response), ex=cache_ttl)
        logger.info(f"Réponse mise en cache (TTL: {cache_ttl}s)")
    except Exception as e:
        logger.warning(f"Erreur cache réponse: {e}")

    return response