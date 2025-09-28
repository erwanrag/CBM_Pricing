# backend/app/services/ai/pricing_analysis_service.py - Version corrigée avec vrais noms de tables CBM
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
import warnings
warnings.filterwarnings('ignore')

from app.common.logger import logger
from app.common.redis_client import redis_client
import json

class PricingAIAnalyzer:
    """Analyseur IA pour détection d'anomalies tarifaires et recommandations"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.anomaly_detector = IsolationForest(
            contamination=0.1,  # 10% d'anomalies attendues
            random_state=42,
            n_estimators=100
        )
        self.clusterer = DBSCAN(eps=0.5, min_samples=5)
    
    async def analyze_pricing_anomalies(self, db: AsyncSession, no_tarif: int = None) -> Dict[str, Any]:
        """Analyse complète des anomalies tarifaires avec IA"""
        logger.info(f"🤖 Démarrage analyse IA pricing (tarif: {no_tarif})")
        
        try:
            # 1. Récupération des données
            pricing_data = await self._fetch_pricing_data(db, no_tarif)
            if len(pricing_data) < 10:
                return {
                    "status": "insufficient_data",
                    "message": "Pas assez de données pour l'analyse IA (min 10 produits)",
                    "data_count": len(pricing_data)
                }
            
            # 2. Préparation des features
            features_df = await self._prepare_features(pricing_data)
            
            # 3. Détection d'anomalies
            anomalies = await self._detect_anomalies(features_df)
            
            # 4. Clustering pour segmentation
            clusters = await self._perform_clustering(features_df)
            
            # 5. Analyse des tendances
            trends = await self._analyze_trends(pricing_data)
            
            # 6. Recommandations basées IA
            recommendations = await self._generate_ai_recommendations(
                pricing_data, anomalies, clusters, trends
            )
            
            result = {
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "analysis": {
                    "total_products": len(pricing_data),
                    "anomalies_detected": len(anomalies),
                    "clusters_found": len(set(clusters)),
                    "anomalies": anomalies,
                    "trends": trends,
                    "recommendations": recommendations,
                    "quality_score": await self._calculate_quality_score(pricing_data, anomalies)
                }
            }
            
            # Cache pour 1 heure
            cache_key = f"ai_analysis:tarif_{no_tarif or 'all'}"
            await redis_client.setex(cache_key, 3600, json.dumps(result, default=str))
            
            logger.info(f"✅ Analyse IA terminée: {len(anomalies)} anomalies, {len(set(clusters))} clusters")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur analyse IA: {e}")
            return {
                "status": "error",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _fetch_pricing_data(self, db: AsyncSession, no_tarif: int = None) -> pd.DataFrame:
        """Récupère les données de pricing pour l'analyse - AVEC LES VRAIS NOMS DE TABLES CBM"""
        tarif_filter = f"AND p.no_tarif = {no_tarif}" if no_tarif else ""
        
        # Requête adaptée aux vraies tables CBM_DATA
        query = text(f"""
            SELECT TOP 500
                p.cod_pro,
                p.refint,
                p.qualite,
                p.famille,
                p.s_famille,
                p.no_tarif,
                p.statut,
                
                -- Prix depuis Comparatif_Tarif_Pivot (si existe)
                COALESCE(ctp.prix_achat, 0) as prix_achat,
                
                -- Stocks depuis les données LM
                COALESCE(ctp.stock_LM, 0) as stock_actuel,
                COALESCE(ctp.pmp_LM, 0) as pmp_LM,
                
                -- Ventes LM
                COALESCE(ctp.qte_LM, 0) as qte_vendue_12m,
                COALESCE(ctp.ca_LM, 0) as ca_12m,
                COALESCE(ctp.marge_LM, 0) as marge_percent
                
            FROM CBM_DATA.Pricing.Dimensions_Produit p
            LEFT JOIN CBM_DATA.Pricing.Comparatif_Tarif_Pivot ctp 
                ON p.cod_pro = ctp.cod_pro
            WHERE p.statut = 1
            {tarif_filter}
            AND (ctp.prix_achat > 0 OR ctp.stock_LM > 0 OR ctp.qte_LM > 0)
            ORDER BY p.cod_pro
        """)
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        if not rows:
            # Fallback avec une requête plus simple
            logger.warning("Aucune donnée dans Comparatif_Tarif_Pivot, fallback sur Dimensions_Produit")
            
            simple_query = text(f"""
                SELECT TOP 100
                    cod_pro,
                    refint,
                    qualite,
                    famille,
                    s_famille, 
                    no_tarif,
                    statut,
                    0 as prix_achat,
                    0 as stock_actuel,
                    0 as pmp_LM,
                    0 as qte_vendue_12m,
                    0 as ca_12m,
                    0 as marge_percent
                FROM CBM_DATA.Pricing.Dimensions_Produit
                WHERE statut = 1
                {tarif_filter}
                ORDER BY cod_pro
            """)
            
            result = await db.execute(simple_query)
            rows = result.fetchall()
        
        return pd.DataFrame([dict(row._mapping) for row in rows])
    
    async def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prépare les features pour l'analyse ML - Version simplifiée"""
        features = df.copy()
        
        # Features de base (avec gestion des valeurs nulles)
        features['prix_achat'] = pd.to_numeric(features['prix_achat'], errors='coerce').fillna(0)
        features['stock_actuel'] = pd.to_numeric(features['stock_actuel'], errors='coerce').fillna(0)
        features['qte_vendue_12m'] = pd.to_numeric(features['qte_vendue_12m'], errors='coerce').fillna(0)
        features['ca_12m'] = pd.to_numeric(features['ca_12m'], errors='coerce').fillna(0)
        features['marge_percent'] = pd.to_numeric(features['marge_percent'], errors='coerce').fillna(0)
        
        # Features transformées
        features['log_prix'] = np.log1p(features['prix_achat'])
        features['log_stock'] = np.log1p(features['stock_actuel'])
        features['log_ventes'] = np.log1p(features['qte_vendue_12m'])
        features['log_ca'] = np.log1p(features['ca_12m'])
        
        # Encoding qualité
        qualite_mapping = {'OE': 4, 'OEM': 3, 'PMQ': 2, 'PMV': 1}
        features['qualite_encoded'] = features['qualite'].map(qualite_mapping).fillna(0)
        
        # Ratios (avec gestion division par zéro)
        features['rotation_stock'] = np.where(
            features['stock_actuel'] > 0,
            features['qte_vendue_12m'] / features['stock_actuel'],
            0
        )
        
        # Features par famille (si assez de données)
        if len(features) > 10:
            try:
                famille_stats = features.groupby('famille').agg({
                    'prix_achat': 'mean',
                    'marge_percent': 'mean'
                }).add_suffix('_famille_avg')
                
                features = features.merge(
                    famille_stats, 
                    left_on='famille', 
                    right_index=True, 
                    how='left'
                )
                
                # Écarts par rapport aux moyennes famille
                features['ecart_prix_famille'] = np.where(
                    features['prix_achat_famille_avg'] > 0,
                    (features['prix_achat'] - features['prix_achat_famille_avg']) / features['prix_achat_famille_avg'],
                    0
                )
            except Exception as e:
                logger.warning(f"Erreur calcul stats famille: {e}")
                features['ecart_prix_famille'] = 0
        else:
            features['ecart_prix_famille'] = 0
        
        # Sélection des features numériques pour ML
        numeric_features = [
            'log_prix', 'log_stock', 'log_ventes', 'log_ca',
            'marge_percent', 'rotation_stock', 'qualite_encoded', 'ecart_prix_famille'
        ]
        
        ml_features = features[numeric_features].fillna(0)
        
        # Normalisation (avec gestion des valeurs constantes)
        try:
            ml_features_scaled = pd.DataFrame(
                self.scaler.fit_transform(ml_features),
                columns=ml_features.columns,
                index=ml_features.index
            )
        except Exception as e:
            logger.warning(f"Erreur normalisation: {e}, utilisation données brutes")
            ml_features_scaled = ml_features
        
        return ml_features_scaled
    
    async def _detect_anomalies(self, features_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Détecte les anomalies avec Isolation Forest"""
        if len(features_df) < 5:
            return []
        
        try:
            anomaly_scores = self.anomaly_detector.fit_predict(features_df)
            outlier_scores = self.anomaly_detector.score_samples(features_df)
            
            anomalies = []
            for idx, (is_anomaly, score) in enumerate(zip(anomaly_scores, outlier_scores)):
                if is_anomaly == -1:  # Anomalie détectée
                    # Identifier les features les plus contributives
                    feature_contributions = np.abs(features_df.iloc[idx].values)
                    top_features = features_df.columns[np.argsort(feature_contributions)[-3:]].tolist()
                    
                    anomalies.append({
                        "index": int(idx),
                        "anomaly_score": float(score),
                        "severity": "high" if score < -0.5 else "medium",
                        "contributing_features": top_features,
                        "type": "pricing_anomaly"
                    })
            
            return sorted(anomalies, key=lambda x: x["anomaly_score"])
        except Exception as e:
            logger.error(f"Erreur détection anomalies: {e}")
            return []
    
    async def _perform_clustering(self, features_df: pd.DataFrame) -> List[int]:
        """Clustering pour segmentation des produits"""
        if len(features_df) < 5:
            return [0] * len(features_df)
        
        try:
            clusters = self.clusterer.fit_predict(features_df)
            logger.info(f"🎯 Clustering: {len(set(clusters))} clusters identifiés")
            return clusters.tolist()
        except Exception as e:
            logger.error(f"Erreur clustering: {e}")
            return [0] * len(features_df)
    
    async def _analyze_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyse des tendances de pricing"""
        trends = {
            "global_stats": {
                "total_products": len(df),
                "avg_margin": float(df['marge_percent'].mean()) if len(df) > 0 else 0,
                "products_with_stock": int((df['stock_actuel'] > 0).sum()),
                "products_with_sales": int((df['qte_vendue_12m'] > 0).sum()),
                "zero_sales_products": int((df['qte_vendue_12m'] == 0).sum())
            },
            "by_quality": {},
            "by_family": {}
        }
        
        # Tendances par qualité
        for qualite in df['qualite'].unique():
            if pd.isna(qualite):
                continue
            subset = df[df['qualite'] == qualite]
            if len(subset) > 0:
                trends["by_quality"][qualite] = {
                    "count": len(subset),
                    "avg_stock": float(subset['stock_actuel'].mean()),
                    "avg_margin": float(subset['marge_percent'].mean())
                }
        
        # Top familles par nombre de produits
        if len(df) > 0:
            famille_counts = df['famille'].value_counts().head(5)
            trends["by_family"] = {
                "top_families": famille_counts.to_dict()
            }
        
        return trends
    
    async def _generate_ai_recommendations(
        self, 
        df: pd.DataFrame, 
        anomalies: List[Dict], 
        clusters: List[int],
        trends: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Génère des recommandations basées sur l'analyse IA"""
        recommendations = []
        
        # 1. Recommandations sur les anomalies
        high_anomalies = [a for a in anomalies if a["severity"] == "high"]
        if len(high_anomalies) > 3:
            recommendations.append({
                "type": "anomaly_correction",
                "priority": "high",
                "title": f"Corriger {len(high_anomalies)} anomalies critiques détectées",
                "description": "Des incohérences dans les données de pricing nécessitent une attention",
                "action": "review_pricing_data",
                "affected_products": len(high_anomalies)
            })
        
        # 2. Recommandations sur les stocks morts
        zero_sales = trends["global_stats"]["zero_sales_products"]
        if zero_sales > 5:
            recommendations.append({
                "type": "inventory_optimization",
                "priority": "medium",
                "title": f"Optimiser {zero_sales} références sans ventes",
                "description": "Produits sans rotation sur les 12 derniers mois",
                "action": "review_inactive_products",
                "affected_products": zero_sales
            })
        
        # 3. Recommandations qualité
        quality_stats = trends.get("by_quality", {})
        if len(quality_stats) > 1:
            # Comparer les marges par qualité
            margins_by_quality = {q: stats["avg_margin"] for q, stats in quality_stats.items()}
            sorted_margins = sorted(margins_by_quality.items(), key=lambda x: x[1], reverse=True)
            
            if len(sorted_margins) >= 2:
                best_quality, best_margin = sorted_margins[0]
                worst_quality, worst_margin = sorted_margins[-1]
                
                if best_margin - worst_margin > 10:  # Plus de 10% d'écart
                    recommendations.append({
                        "type": "quality_analysis",
                        "priority": "low",
                        "title": f"Écart de marge significatif entre qualités",
                        "description": f"{best_quality}: {best_margin:.1f}% vs {worst_quality}: {worst_margin:.1f}%",
                        "action": "analyze_quality_pricing",
                        "affected_products": sum(stats["count"] for stats in quality_stats.values())
                    })
        
        # 4. Recommandations clustering
        unique_clusters = len(set(clusters))
        if unique_clusters > 1:
            cluster_counts = pd.Series(clusters).value_counts()
            noise_points = cluster_counts.get(-1, 0)  # Points de bruit DBSCAN
            
            if noise_points > len(df) * 0.2:  # Plus de 20% de points atypiques
                recommendations.append({
                    "type": "segmentation",
                    "priority": "low",
                    "title": f"{noise_points} produits atypiques identifiés",
                    "description": "Produits ne correspondant à aucun segment standard",
                    "action": "manual_review_atypical",
                    "affected_products": int(noise_points)
                })
        
        return sorted(recommendations, key=lambda x: {"high": 3, "medium": 2, "low": 1}[x["priority"]], reverse=True)
    
    async def _calculate_quality_score(self, df: pd.DataFrame, anomalies: List[Dict]) -> Dict[str, Any]:
        """Calcule un score de qualité global du pricing"""
        total_products = len(df)
        if total_products == 0:
            return {"overall_score": 0, "message": "Aucune donnée à analyser"}
        
        anomaly_rate = len(anomalies) / total_products
        
        # Métriques de qualité
        consistency_quality = 1 - anomaly_rate
        data_completeness = (df['prix_achat'] > 0).sum() / total_products if total_products > 0 else 0
        activity_quality = (df['qte_vendue_12m'] > 0).sum() / total_products if total_products > 0 else 0
        
        overall_score = (consistency_quality + data_completeness + activity_quality) / 3
        
        return {
            "overall_score": round(overall_score * 100, 1),
            "consistency_quality": round(consistency_quality * 100, 1),
            "data_completeness": round(data_completeness * 100, 1),
            "activity_quality": round(activity_quality * 100, 1),
            "total_products_analyzed": total_products,
            "anomalies_detected": len(anomalies)
        }

# Instance globale
pricing_ai_analyzer = PricingAIAnalyzer()

# === Fonctions d'API ===

async def run_ai_pricing_analysis(db: AsyncSession, no_tarif: int = None) -> Dict[str, Any]:
    """Point d'entrée pour l'analyse IA du pricing"""
    # Vérifier le cache d'abord
    cache_key = f"ai_analysis:tarif_{no_tarif or 'all'}"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            logger.info("📋 Analyse IA récupérée du cache")
            return json.loads(cached)
    except Exception:
        pass
    
    return await pricing_ai_analyzer.analyze_pricing_anomalies(db, no_tarif)

async def get_ai_recommendations_summary(db: AsyncSession) -> List[Dict[str, Any]]:
    """Récupère un résumé des recommandations IA pour le dashboard"""
    analysis = await run_ai_pricing_analysis(db)
    
    if analysis.get("status") != "success":
        return []
    
    recommendations = analysis.get("analysis", {}).get("recommendations", [])
    
    # Limiter aux 5 recommandations les plus importantes
    return recommendations[:5]