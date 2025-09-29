# backend/app/common/query_cache_service.py
import hashlib
import json
from typing import Any, Dict, Optional, List
from sqlalchemy import text
from app.common.redis_client import redis_client
from app.common.logger import logger

class QueryCacheService:
    """Service de cache intelligent pour les requêtes SQL répétitives"""
    
    def __init__(self):
        self.cache_stats = {"hits": 0, "misses": 0}
    
    def _generate_cache_key(self, query: str, params: Dict = None) -> str:
        """Génère une clé de cache basée sur la requête et paramètres"""
        # Nettoyer la requête (espaces, retours à la ligne)
        clean_query = " ".join(query.split())
        
        # Créer un hash des paramètres triés
        params_str = json.dumps(params or {}, sort_keys=True, default=str)
        content = f"{clean_query}|{params_str}"
        
        # Hash court pour Redis
        hash_key = hashlib.md5(content.encode()).hexdigest()[:16]
        return f"sql_cache:{hash_key}"
    
    async def get_cached_query(
        self, 
        db, 
        query: str, 
        params: Dict = None, 
        cache_ttl: int = 300  # 5 minutes par défaut
    ) -> List[Dict]:
        """
        Exécute une requête avec cache Redis
        
        Args:
            db: Session SQLAlchemy
            query: Requête SQL
            params: Paramètres de la requête
            cache_ttl: Durée de vie du cache en secondes
            
        Returns:
            Liste des résultats sous forme de dictionnaires
        """
        cache_key = self._generate_cache_key(query, params)
        
        # 1. Tentative de récupération depuis le cache
        try:
            cached_result = await redis_client.get(cache_key)
            if cached_result:
                self.cache_stats["hits"] += 1
                logger.debug(f"Cache HIT: {cache_key[:20]}...")
                return json.loads(cached_result)
        except Exception as e:
            logger.warning(f"Erreur lecture cache: {e}")
        
        # 2. Exécution de la requête si pas en cache
        self.cache_stats["misses"] += 1
        logger.debug(f"Cache MISS: {cache_key[:20]}...")
        
        try:
            # Exécuter la requête
            result = await db.execute(text(query), params or {})
            rows = result.fetchall()
            
            # Convertir en format sérialisable
            data = []
            for row in rows:
                # Support des différents types de Row SQLAlchemy
                if hasattr(row, '_mapping'):
                    row_dict = dict(row._mapping)
                else:
                    row_dict = dict(row)
                
                # Conversion des types non-JSON (Decimal, datetime, etc.)
                data.append(self._serialize_row(row_dict))
            
            # 3. Mise en cache du résultat
            try:
                await redis_client.set(
                    cache_key, 
                    json.dumps(data, default=str), 
                    ex=cache_ttl
                )
                logger.debug(f"Cache SET: {cache_key[:20]} (TTL: {cache_ttl}s)")
            except Exception as e:
                logger.warning(f"Erreur écriture cache: {e}")
            
            return data
            
        except Exception as e:
            logger.error(f"Erreur exécution requête: {e}")
            raise
    
    def _serialize_row(self, row_dict: Dict) -> Dict:
        """Convertit une ligne en format JSON-sérialisable"""
        serialized = {}
        for key, value in row_dict.items():
            if value is None:
                serialized[key] = None
            elif hasattr(value, '__float__'):  # Decimal
                serialized[key] = float(value)
            elif hasattr(value, 'isoformat'):  # datetime
                serialized[key] = value.isoformat()
            else:
                serialized[key] = value
        return serialized
    
    async def invalidate_cache_pattern(self, pattern: str):
        """Invalide le cache selon un pattern"""
        try:
            keys = await redis_client.keys(f"sql_cache:*{pattern}*")
            if keys:
                await redis_client.delete(*keys)
                logger.info(f"Invalidé {len(keys)} clés de cache pour pattern: {pattern}")
        except Exception as e:
            logger.error(f"Erreur invalidation cache: {e}")
    
    def get_cache_stats(self) -> Dict:
        """Retourne les statistiques du cache"""
        total = self.cache_stats["hits"] + self.cache_stats["misses"]
        hit_rate = (self.cache_stats["hits"] / total * 100) if total > 0 else 0
        
        return {
            "total_queries": total,
            "cache_hits": self.cache_stats["hits"],
            "cache_misses": self.cache_stats["misses"],
            "hit_rate_percent": round(hit_rate, 2)
        }

# Instance globale
query_cache = QueryCacheService()