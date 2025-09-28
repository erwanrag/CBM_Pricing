# backend/app/services/monitoring/monitoring_service.py
import asyncio
import time
import psutil
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.common.logger import logger
from app.common.redis_client import redis_client
import json

class SystemMonitor:
    """Monitoring système et application pour CBM_Pricing"""
    
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.slow_queries = []
    
    async def get_health_status(self, db: AsyncSession) -> Dict[str, Any]:
        """Status de santé complet de l'application"""
        status = {
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": time.time() - self.start_time,
            "status": "healthy",
            "checks": {}
        }
        
        # Test base de données
        try:
            result = await db.execute(text("SELECT 1"))
            result.fetchone()
            status["checks"]["database"] = {"status": "ok", "response_time_ms": 0}
        except Exception as e:
            status["checks"]["database"] = {"status": "error", "error": str(e)}
            status["status"] = "unhealthy"
        
        # Test Redis
        try:
            start = time.time()
            await redis_client.ping()
            response_time = (time.time() - start) * 1000
            status["checks"]["redis"] = {"status": "ok", "response_time_ms": round(response_time, 2)}
        except Exception as e:
            status["checks"]["redis"] = {"status": "error", "error": str(e)}
            status["status"] = "degraded"
        
        # Métriques système
        status["system"] = {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "request_count": self.request_count,
            "error_count": self.error_count,
            "error_rate": self.error_count / max(self.request_count, 1)
        }
        
        return status
    
    async def get_performance_metrics(self, db: AsyncSession) -> Dict[str, Any]:
        """Métriques de performance détaillées"""
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "database": await self._get_db_metrics(db),
            "cache": await self._get_cache_metrics(),
            "application": await self._get_app_metrics(),
            "slow_queries": self.slow_queries[-10:]  # 10 dernières requêtes lentes
        }
        
        return metrics
    
    async def _get_db_metrics(self, db: AsyncSession) -> Dict[str, Any]:
        """Métriques base de données"""
        try:
            # Connexions actives
            result = await db.execute(text("""
                SELECT 
                    COUNT(*) as active_connections,
                    MAX(total_elapsed_time) as max_elapsed_time,
                    AVG(total_elapsed_time) as avg_elapsed_time
                FROM sys.dm_exec_sessions 
                WHERE is_user_process = 1
            """))
            db_stats = result.fetchone()
            
            # Top requêtes consommatrices
            result = await db.execute(text("""
                SELECT TOP 5
                    SUBSTRING(st.text, (qs.statement_start_offset/2) + 1,
                    ((CASE statement_end_offset WHEN -1 THEN DATALENGTH(st.text)
                    ELSE qs.statement_end_offset END - qs.statement_start_offset)/2) + 1) AS query_text,
                    qs.execution_count,
                    qs.total_elapsed_time / qs.execution_count AS avg_elapsed_time
                FROM sys.dm_exec_query_stats AS qs
                CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st
                WHERE st.text LIKE '%CBM_DATA%'
                ORDER BY qs.total_elapsed_time DESC
            """))
            top_queries = result.fetchall()
            
            return {
                "active_connections": db_stats.active_connections if db_stats else 0,
                "max_elapsed_time": db_stats.max_elapsed_time if db_stats else 0,
                "avg_elapsed_time": db_stats.avg_elapsed_time if db_stats else 0,
                "top_queries": [
                    {
                        "query": q.query_text[:100] + "..." if len(q.query_text) > 100 else q.query_text,
                        "execution_count": q.execution_count,
                        "avg_elapsed_time": q.avg_elapsed_time
                    }
                    for q in top_queries
                ]
            }
        except Exception as e:
            logger.error(f"Erreur métriques DB: {e}")
            return {"error": str(e)}
    
    async def _get_cache_metrics(self) -> Dict[str, Any]:
        """Métriques cache Redis"""
        try:
            info = await redis_client.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": info.get("keyspace_hits", 0) / max(
                    info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1
                )
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def _get_app_metrics(self) -> Dict[str, Any]:
        """Métriques application"""
        return {
            "uptime_seconds": time.time() - self.start_time,
            "requests_total": self.request_count,
            "errors_total": self.error_count,
            "error_rate_percent": round((self.error_count / max(self.request_count, 1)) * 100, 2),
            "memory_usage_mb": round(psutil.Process().memory_info().rss / 1024 / 1024, 2)
        }
    
    async def check_business_rules(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Vérification des règles métier et alertes"""
        alerts = []
        
        try:
            # Alerte: Produits sans prix depuis > 30 jours
            result = await db.execute(text("""
                SELECT COUNT(*) as count
                FROM CBM_DATA.Pricing.Dimensions_Produit p
                LEFT JOIN CBM_DATA.Pricing.Prix_Vente pv ON p.cod_pro = pv.cod_pro
                WHERE pv.cod_pro IS NULL OR pv.date_debut < DATEADD(day, -30, GETDATE())
            """))
            produits_sans_prix = result.fetchone().count
            
            if produits_sans_prix > 100:
                alerts.append({
                    "type": "business_rule",
                    "severity": "warning",
                    "message": f"{produits_sans_prix} produits sans prix récent",
                    "recommendation": "Vérifier la mise à jour des tarifs"
                })
            
            # Alerte: Incohérences tarifaires majeures
            result = await db.execute(text("""
                SELECT COUNT(*) as violations
                FROM CBM_DATA.Pricing.Alertes_Tarif
                WHERE statut = 'ACTIVE' AND priorite = 'HIGH'
                AND date_detection >= DATEADD(hour, -24, GETDATE())
            """))
            violations = result.fetchone().violations
            
            if violations > 50:
                alerts.append({
                    "type": "pricing_violations",
                    "severity": "critical",
                    "message": f"{violations} violations tarifaires critiques détectées",
                    "recommendation": "Intervention immédiate requise"
                })
            
            # Alerte: Performance dégradée
            if len(self.slow_queries) > 10:
                alerts.append({
                    "type": "performance",
                    "severity": "warning", 
                    "message": f"{len(self.slow_queries)} requêtes lentes détectées",
                    "recommendation": "Optimiser les requêtes SQL"
                })
            
        except Exception as e:
            logger.error(f"Erreur vérification règles métier: {e}")
            alerts.append({
                "type": "monitoring_error",
                "severity": "error",
                "message": f"Erreur monitoring: {str(e)}"
            })
        
        return alerts
    
    def log_slow_query(self, query: str, duration: float, params: Dict = None):
        """Enregistre une requête lente"""
        if duration > 1.0:  # > 1 seconde
            self.slow_queries.append({
                "timestamp": datetime.now().isoformat(),
                "query": query[:200] + "..." if len(query) > 200 else query,
                "duration_seconds": round(duration, 3),
                "params": params
            })
            
            # Garder seulement les 50 dernières
            if len(self.slow_queries) > 50:
                self.slow_queries = self.slow_queries[-50:]
    
    def increment_request_count(self):
        """Incrémente le compteur de requêtes"""
        self.request_count += 1
    
    def increment_error_count(self):
        """Incrémente le compteur d'erreurs"""
        self.error_count += 1

class AlertManager:
    """Gestionnaire d'alertes avec notifications"""
    
    def __init__(self):
        self.alert_history = []
        self.notification_channels = []
    
    async def send_alert(self, alert: Dict[str, Any], channels: List[str] = None):
        """Envoie une alerte via les canaux configurés"""
        alert["id"] = f"alert_{int(time.time())}"
        alert["timestamp"] = datetime.now().isoformat()
        
        # Stockage historique
        self.alert_history.append(alert)
        if len(self.alert_history) > 1000:
            self.alert_history = self.alert_history[-1000:]
        
        # Envoi selon la sévérité
        if alert.get("severity") == "critical":
            await self._send_critical_alert(alert)
        elif alert.get("severity") == "warning":
            await self._send_warning_alert(alert)
        
        logger.warning(f"ALERTE {alert['severity'].upper()}: {alert['message']}")
    
    async def _send_critical_alert(self, alert: Dict[str, Any]):
        """Envoi d'alerte critique (email, SMS, Slack...)"""
        # Ici implémenter l'envoi réel (SMTP, Slack webhook, etc.)
        await self._log_to_redis(alert)
    
    async def _send_warning_alert(self, alert: Dict[str, Any]):
        """Envoi d'alerte warning (moins urgente)"""
        await self._log_to_redis(alert)
    
    async def _log_to_redis(self, alert: Dict[str, Any]):
        """Stockage alerte dans Redis pour le dashboard"""
        try:
            key = f"alerts:recent"
            await redis_client.lpush(key, json.dumps(alert))
            await redis_client.ltrim(key, 0, 99)  # Garder 100 dernières
            await redis_client.expire(key, 86400)  # 24h
        except Exception as e:
            logger.error(f"Erreur stockage alerte Redis: {e}")

# Instances globales
system_monitor = SystemMonitor()
alert_manager = AlertManager()

# === Fonctions utilitaires ===

async def run_health_check(db: AsyncSession) -> Dict[str, Any]:
    """Point d'entrée pour le health check"""
    return await system_monitor.get_health_status(db)

async def run_performance_check(db: AsyncSession) -> Dict[str, Any]:
    """Point d'entrée pour les métriques de performance"""
    return await system_monitor.get_performance_metrics(db)

async def run_business_monitoring(db: AsyncSession) -> List[Dict[str, Any]]:
    """Point d'entrée pour la surveillance métier"""
    alerts = await system_monitor.check_business_rules(db)
    
    # Envoyer les alertes critiques
    for alert in alerts:
        if alert.get("severity") in ["critical", "warning"]:
            await alert_manager.send_alert(alert)
    
    return alerts

async def start_monitoring_background_task():
    """Tâche de fond pour monitoring continu"""
    logger.info("🎯 Démarrage monitoring en arrière-plan")
    
    while True:
        try:
            # Toutes les 5 minutes, vérifications de base
            await asyncio.sleep(300)
            
            # Ici on pourrait ajouter des vérifications périodiques
            # Ex: vérifier la fraîcheur des données, les seuils, etc.
            
        except Exception as e:
            logger.error(f"Erreur monitoring background: {e}")
            await asyncio.sleep(60)  # Attendre 1 min avant retry