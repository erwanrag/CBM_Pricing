# backend/app/routers/monitoring.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.db.database import get_db
from app.services.monitoring.monitoring_service import (
    run_health_check,
    run_performance_check, 
    run_business_monitoring,
    system_monitor,
    alert_manager
)
from app.services.ai.pricing_analysis_service import (
    run_ai_pricing_analysis,
    get_ai_recommendations_summary
)
from app.common.logger import logger

router = APIRouter(prefix="/monitoring", tags=["Monitoring & IA"])

@router.get("/health", summary="🔍 Health Check Complet")
async def health_check(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Health check complet de l'application CBM_Pricing
    
    Vérifie:
    - Connectivité base de données
    - Statut Redis 
    - Métriques système (CPU, RAM)
    - Temps de réponse
    """
    try:
        health_status = await run_health_check(db)
        
        # Incrémenter le monitoring des requêtes
        system_monitor.increment_request_count()
        
        # Retourner le statut avec code HTTP approprié
        if health_status["status"] == "healthy":
            return health_status
        elif health_status["status"] == "degraded":
            return health_status  # 200 mais signaler la dégradation
        else:
            # Status "unhealthy" 
            raise HTTPException(status_code=503, detail=health_status)
            
    except Exception as e:
        system_monitor.increment_error_count()
        logger.error(f"Erreur health check: {e}")
        raise HTTPException(
            status_code=503, 
            detail={"status": "unhealthy", "error": str(e)}
        )

@router.get("/metrics", summary="📊 Métriques Performance")
async def performance_metrics(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Métriques détaillées de performance
    
    Inclut:
    - Statistiques base de données
    - Métriques cache Redis
    - Performance application
    - Requêtes lentes
    """
    try:
        system_monitor.increment_request_count()
        metrics = await run_performance_check(db)
        
        return {
            "status": "success",
            "metrics": metrics,
            "collected_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        system_monitor.increment_error_count()
        logger.error(f"Erreur récupération métriques: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts", summary="🚨 Alertes Métier")
async def business_alerts(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Surveillance des règles métier et alertes
    
    Vérifie:
    - Cohérence des données de pricing
    - Violations des règles tarifaires
    - Anomalies détectées
    """
    try:
        system_monitor.increment_request_count()
        alerts = await run_business_monitoring(db)
        
        return {
            "status": "success", 
            "alerts": alerts,
            "alert_count": len(alerts),
            "critical_count": len([a for a in alerts if a.get("severity") == "critical"]),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        system_monitor.increment_error_count()
        logger.error(f"Erreur vérification alertes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts/history", summary="📋 Historique Alertes")
async def alerts_history(
    limit: int = Query(50, ge=1, le=500, description="Nombre d'alertes à récupérer")
) -> Dict[str, Any]:
    """Récupère l'historique des alertes envoyées"""
    try:
        system_monitor.increment_request_count()
        
        history = alert_manager.alert_history[-limit:] if alert_manager.alert_history else []
        
        return {
            "status": "success",
            "alerts": history,
            "total_count": len(alert_manager.alert_history),
            "returned_count": len(history)
        }
        
    except Exception as e:
        logger.error(f"Erreur historique alertes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/test", summary="🧪 Test Alerte")
async def test_alert(
    severity: str = Query("warning", regex="^(critical|warning|info)$"),
    message: str = Query("Test alerte CBM_Pricing")
) -> Dict[str, Any]:
    """Envoie une alerte de test pour vérifier le système de notification"""
    try:
        test_alert = {
            "type": "test",
            "severity": severity,
            "message":