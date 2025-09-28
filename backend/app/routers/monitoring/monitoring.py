# backend/app/routers/monitoring/monitoring.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy import text
from app.db.dependencies import get_db
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
            "message": message,
            "source": "manual_test",
            "user": "system"
        }
        
        await alert_manager.send_alert(test_alert)
        
        return {
            "status": "success",
            "message": "Alerte de test envoyée",
            "alert": test_alert
        }
        
    except Exception as e:
        logger.error(f"Erreur envoi alerte test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === ENDPOINTS IA ===

@router.get("/ai/analysis", summary="🤖 Analyse IA Pricing")
async def ai_pricing_analysis(
    no_tarif: Optional[int] = Query(None, description="Tarif spécifique à analyser"),
    force_refresh: bool = Query(False, description="Forcer le recalcul (ignorer cache)"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Analyse IA complète du pricing avec détection d'anomalies
    
    Fonctionnalités:
    - Détection d'anomalies avec Isolation Forest
    - Clustering pour segmentation produits
    - Analyse des tendances de marge
    - Recommandations automatiques
    - Score de qualité global
    """
    try:
        system_monitor.increment_request_count()
        
        # Effacer cache si demandé
        if force_refresh:
            from app.common.redis_client import redis_client
            cache_key = f"ai_analysis:tarif_{no_tarif or 'all'}"
            await redis_client.delete(cache_key)
        
        analysis = await run_ai_pricing_analysis(db, no_tarif)
        
        return analysis
        
    except Exception as e:
        system_monitor.increment_error_count()
        logger.error(f"Erreur analyse IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai/recommendations", summary="💡 Recommandations IA")
async def ai_recommendations(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Recommandations IA pour le dashboard
    
    Retourne les 5 recommandations les plus importantes basées sur:
    - Anomalies détectées
    - Optimisations de marge possibles  
    - Gestion des stocks morts
    - Cohérence qualité/prix
    """
    try:
        system_monitor.increment_request_count()
        
        recommendations = await get_ai_recommendations_summary(db)
        
        return {
            "status": "success",
            "recommendations": recommendations,
            "count": len(recommendations),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        system_monitor.increment_error_count()
        logger.error(f"Erreur recommandations IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai/anomalies/{cod_pro}", summary="🔍 Détail Anomalie Produit")
async def product_anomaly_detail(
    cod_pro: int,
    no_tarif: Optional[int] = Query(None, description="Numéro de tarif (optionnel)"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Analyse détaillée d'une anomalie pour un produit spécifique"""
    from sqlalchemy import text
    
    try:
        system_monitor.increment_request_count()
        
        # Si pas de tarif spécifié, prendre le premier disponible
        if no_tarif is None:
            tarif_query = text("""
                SELECT TOP 1 no_tarif 
                FROM CBM_DATA.Pricing.Dimensions_Produit 
                WHERE cod_pro = :cod_pro 
                ORDER BY no_tarif
            """)
            result = await db.execute(tarif_query, {"cod_pro": cod_pro})
            tarif_row = result.fetchone()
            if not tarif_row:
                raise HTTPException(status_code=404, detail="Produit non trouvé")
            no_tarif = tarif_row[0]
        
        # Construire la requête avec colonnes dynamiques selon le tarif
        query = text(f"""
            SELECT DISTINCT
                p.cod_pro, 
                p.refint, 
                p.qualite, 
                p.famille,
                p.s_famille,
                p.no_tarif,
                p.statut,
                COALESCE(ctp.prix_achat, 0) as prix_achat,
                COALESCE(ctp.prix_{no_tarif}, 0) as prix_vente,
                COALESCE(ctp.qte_{no_tarif}, 0) as qte_vendue,
                COALESCE(ctp.ca_{no_tarif}, 0) as ca_realise,
                COALESCE(ctp.marge_{no_tarif}, 0) as marge_tarif,
                COALESCE(ctp.marge_realisee_{no_tarif}, 0) as marge_realisee,
                COALESCE(ctp.stock_LM, 0) as stock_actuel,
                COALESCE(ctp.pmp_LM, 0) as pmp_LM,
                COALESCE(ctp.qte_LM, 0) as qte_LM,
                COALESCE(ctp.ca_LM, 0) as ca_LM,
                COALESCE(ctp.marge_LM, 0) as marge_LM
            FROM CBM_DATA.Pricing.Dimensions_Produit p
            LEFT JOIN CBM_DATA.Pricing.Comparatif_Tarif_Pivot ctp 
                ON p.cod_pro = ctp.cod_pro
            WHERE p.cod_pro = :cod_pro AND p.no_tarif = :no_tarif
        """)
        
        result = await db.execute(query, {"cod_pro": cod_pro, "no_tarif": no_tarif})
        product_data = result.fetchone()
        
        if not product_data:
            raise HTTPException(status_code=404, detail=f"Produit {cod_pro} non trouvé pour le tarif {no_tarif}")
        
        # Récupérer tous les tarifs disponibles
        all_tarifs_query = text("""
            SELECT DISTINCT no_tarif
            FROM CBM_DATA.Pricing.Dimensions_Produit
            WHERE cod_pro = :cod_pro
            ORDER BY no_tarif
        """)
        tarifs_result = await db.execute(all_tarifs_query, {"cod_pro": cod_pro})
        available_tarifs = [row[0] for row in tarifs_result.fetchall()]
        
        # Construire la réponse
        product_info = dict(product_data._mapping)
        
        # Générer des recommandations spécifiques
        recommendations = []
        
        prix_vente = product_info.get('prix_vente', 0)
        prix_achat = product_info.get('prix_achat', 0)
        marge_realisee = product_info.get('marge_realisee', 0)
        statut = product_info.get('statut', 0)
        
        # Calcul du taux de marge théorique
        taux_marge_theorique = 0
        if prix_achat > 0 and prix_vente > 0:
            taux_marge_theorique = ((prix_vente - prix_achat) / prix_achat) * 100
        
        # Recommandations basées sur la marge
        if prix_vente > 0 and prix_achat > 0 and taux_marge_theorique < 10:
            recommendations.append({
                "type": "low_margin",
                "message": f"Marge théorique faible: {taux_marge_theorique:.1f}%",
                "priority": "medium",
                "action": "review_pricing_strategy"
            })
        
        # Recommandations basées sur les prix manquants
        if prix_vente == 0:
            recommendations.append({
                "type": "missing_price",
                "message": f"Prix de vente manquant pour le tarif {no_tarif}",
                "priority": "high",
                "action": "set_sales_price"
            })
        
        if prix_achat == 0:
            recommendations.append({
                "type": "missing_cost_data",
                "message": "Prix d'achat manquant",
                "priority": "medium",
                "action": "update_cost_data"
            })
        
        # Recommandations basées sur le statut - LOGIQUE CORRIGÉE
        if statut == 1:
            recommendations.append({
                "type": "purchase_blocked",
                "message": "Produit bloqué en achat (statut 1)",
                "priority": "low",
                "action": "review_purchase_restrictions"
            })
        elif statut == 2:
            recommendations.append({
                "type": "sales_blocked", 
                "message": "Produit bloqué en vente (statut 2)",
                "priority": "medium",
                "action": "review_sales_restrictions"
            })
        elif statut == 4:
            recommendations.append({
                "type": "fully_blocked",
                "message": "Produit bloqué en achat et vente (statut 4)", 
                "priority": "high",
                "action": "review_product_blocks"
            })
        
        # Recommandation si stock important sans ventes
        stock_actuel = product_info.get('stock_actuel', 0)
        qte_vendue = product_info.get('qte_vendue', 0)
        if stock_actuel > 100 and qte_vendue == 0 and statut == 0:
            recommendations.append({
                "type": "dead_stock",
                "message": f"Stock important ({stock_actuel} unités) sans ventes sur ce tarif",
                "priority": "medium",
                "action": "review_stock_rotation"
            })
        
        return {
            "status": "success",
            "cod_pro": cod_pro,
            "no_tarif": no_tarif,
            "available_tarifs": available_tarifs,
            "product": product_info,
            "analysis_recommendations": recommendations,
            "pricing_analysis": {
                "taux_marge_theorique_percent": round(taux_marge_theorique, 2),
                "has_complete_pricing": prix_vente > 0 and prix_achat > 0,
                "margin_status": "low" if taux_marge_theorique < 10 else "normal" if taux_marge_theorique < 50 else "high"
            },
            "data_quality": {
                "has_cost_data": prix_achat > 0,
                "has_sales_price": prix_vente > 0,
                "has_stock_data": stock_actuel > 0,
                "has_sales_data": qte_vendue > 0,
                "is_active": statut == 0,  # CORRIGÉ: statut 0 = actif
                "status_description": {
                    0: "Actif",
                    1: "Interdit achat", 
                    2: "Interdit vente",
                    4: "Interdit achat et vente"
                }.get(statut, "Statut inconnu"),
                "status_code": statut
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        system_monitor.increment_error_count()
        logger.error(f"Erreur détail anomalie produit {cod_pro}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
# === ENDPOINTS CONFIGURATION ===

@router.get("/config", summary="⚙️ Configuration Monitoring")
async def monitoring_config() -> Dict[str, Any]:
    """Configuration actuelle du système de monitoring"""
    return {
        "status": "success",
        "config": {
            "monitoring_enabled": True,
            "ai_analysis_enabled": True,
            "alert_channels": ["redis", "logs"],
            "cache_ttl": {
                "health_check": 60,
                "ai_analysis": 3600,
                "performance_metrics": 300
            },
            "thresholds": {
                "slow_query_ms": 1000,
                "high_cpu_percent": 80,
                "high_memory_percent": 85,
                "max_anomalies": 50
            },
            "ai_models": {
                "anomaly_detection": "IsolationForest",
                "clustering": "DBSCAN",
                "contamination_rate": 0.1
            }
        }
    }

@router.post("/config/alerts", summary="🔧 Configurer Alertes")
async def configure_alerts(
    critical_threshold: int = Query(10, description="Seuil alertes critiques"),
    warning_threshold: int = Query(25, description="Seuil alertes warning"),
    enable_email: bool = Query(False, description="Activer notifications email"),
    enable_slack: bool = Query(False, description="Activer notifications Slack")
) -> Dict[str, Any]:
    """Configure les seuils et canaux d'alerte"""
    
    # Ici on pourrait sauvegarder la config en base
    # Pour la démo, on retourne juste la confirmation
    
    config = {
        "critical_threshold": critical_threshold,
        "warning_threshold": warning_threshold,
        "channels": {
            "email": enable_email,
            "slack": enable_slack,
            "redis": True,  # Toujours actif
            "logs": True    # Toujours actif
        },
        "updated_at": datetime.now().isoformat()
    }
    
    logger.info(f"🔧 Configuration alertes mise à jour: {config}")
    
    return {
        "status": "success",
        "message": "Configuration des alertes mise à jour",
        "config": config
    }

# === ENDPOINT STATUS GLOBAL ===

@router.get("/status", summary="🎯 Status Global CBM_Pricing")
async def global_status(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Status global consolidé de l'application CBM_Pricing
    
    Combine:
    - Health check
    - Métriques clés
    - Alertes récentes  
    - Recommandations IA top 3
    """
    try:
        system_monitor.increment_request_count()
        
        # Récupérer toutes les données en parallèle
        import asyncio
        
        health_task = run_health_check(db)
        metrics_task = run_performance_check(db)
        alerts_task = run_business_monitoring(db)
        recommendations_task = get_ai_recommendations_summary(db)
        
        health, metrics, alerts, recommendations = await asyncio.gather(
            health_task, metrics_task, alerts_task, recommendations_task,
            return_exceptions=True
        )
        
        # Construire le status global
        status = {
            "timestamp": datetime.now().isoformat(),
            "application": "CBM_Pricing",
            "version": "1.0.0",
            "environment": "production",  # À adapter selon CBM_ENV
            
            "health": health if not isinstance(health, Exception) else {"status": "error", "error": str(health)},
            
            "summary": {
                "overall_status": "healthy",  # À calculer selon les checks
                "active_alerts": len(alerts) if not isinstance(alerts, Exception) else 0,
                "critical_alerts": len([a for a in (alerts if not isinstance(alerts, Exception) else []) if a.get("severity") == "critical"]),
                "ai_recommendations": len(recommendations) if not isinstance(recommendations, Exception) else 0,
                "uptime_seconds": round(system_monitor.start_time - system_monitor.start_time if hasattr(system_monitor, 'start_time') else 0),
            },
            
            "quick_metrics": {
                "request_count": system_monitor.request_count,
                "error_count": system_monitor.error_count,
                "error_rate": round((system_monitor.error_count / max(system_monitor.request_count, 1)) * 100, 2)
            },
            
            "recent_alerts": (alerts if not isinstance(alerts, Exception) else [])[:3],
            "top_recommendations": (recommendations if not isinstance(recommendations, Exception) else [])[:3]
        }
        
        # Déterminer le status global
        if isinstance(health, Exception) or (isinstance(health, dict) and health.get("status") == "unhealthy"):
            status["summary"]["overall_status"] = "unhealthy"
        elif status["summary"]["critical_alerts"] > 0:
            status["summary"]["overall_status"] = "degraded"
        
        return status
        
    except Exception as e:
        system_monitor.increment_error_count()
        logger.error(f"Erreur status global: {e}")
        raise HTTPException(status_code=500, detail=str(e))