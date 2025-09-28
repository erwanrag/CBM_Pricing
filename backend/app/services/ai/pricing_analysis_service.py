# backend/app/services/ai/pricing_analysis_service.py
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
        """Récupère les données de pricing pour l'analyse"""
        tarif_filter = f"AND pv.no_tarif = {no_tarif}" if no_tarif else ""
        
        query = text(f"""
            SELECT 
                p.cod_pro,
                p.refint,
                p.nom_pro,
                p.qualite,
                p.famille,
                p.s_famille,
                p.no_tarif,
                pv.prix_vente,
                pa.prix_achat,
                CASE 
                    WHEN pa.prix_achat > 0 
                    THEN (pv.prix_vente - pa.prix_achat) / pa.prix_achat * 100
                    ELSE NULL 
                END as marge_percent,
                s.stock_actuel,
                COALESCE(v.qte_vendue_12m, 0) as qte_vendue_12m,
                COALESCE(v.ca_12m, 0) as ca_12m,
                CASE 
                    WHEN v.qte_vendue_12m > 0 
                    THEN pv.prix_vente * v.qte_vendue_12m 
                    ELSE 0 
                END as ca_potentiel
            FROM CBM_DATA.Pricing.Dimensions_Produit p
            LEFT JOIN CBM_DATA.Pricing.Prix_Vente pv ON p.cod_pro = pv.cod_pro AND p.no_tarif = pv.no_tarif
            LEFT JOIN CBM_DATA.Pricing.Prix_Achat pa ON p.cod_pro = pa.cod_pro
            LEFT JOIN CBM_DATA.Pricing.Stocks s ON p.cod_pro = s.cod_pro
            LEFT JOIN (
                SELECT 
                    cod_pro,
                    SUM(quantite) as qte_vendue_12m,
                    SUM(chiffre_affaires) as ca_12m
                FROM CBM_DATA.Pricing.Ventes
                WHERE date_vente >= DATEADD(month, -12, GETDATE())
                GROUP BY cod_pro
            ) v ON p.cod_pro = v.cod_pro
            WHERE pv.prix_vente > 0 
            AND pa.prix_achat > 0
            {tarif_filter}
            AND p.statut = 1
        """)
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        return pd.DataFrame([dict(row._mapping) for row in rows])
    
    async def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prépare les features pour l'analyse ML"""
        features = df.copy()
        
        # Features de base
        features['log_prix_vente'] = np.log1p(features['prix_vente'].fillna(0))
        features['log_prix_achat'] = np.log1p(features['prix_achat'].fillna(0))
        features['log_stock'] = np.log1p(features['stock_actuel'].fillna(0))
        features['log_ventes'] = np.log1p(features['qte_vendue_12m'].fillna(0))
        
        # Ratios et features dérivées
        features['ratio_prix_achat_vente'] = features['prix_achat'] / features['prix_vente'].replace(0, np.nan)
        features['rotation_stock'] = features['qte_vendue_12m'] / features['stock_actuel'].replace(0, np.nan)
        features['prix_unitaire_moyen'] = features['ca_12m'] / features['qte_vendue_12m'].replace(0, np.nan)
        
        # Encoding qualité
        qualite_mapping = {'OE': 4, 'OEM': 3, 'PMQ': 2, 'PMV': 1}
        features['qualite_encoded'] = features['qualite'].map(qualite_mapping).fillna(0)
        
        # Features par famille (moyennes de groupe)
        famille_stats = features.groupby('famille').agg({
            'prix_vente': 'mean',
            'marge_percent': 'mean',
            'qte_vendue_12m': 'mean'
        }).add_suffix('_famille_avg')
        
        features = features.merge(
            famille_stats, 
            left_on='famille', 
            right_index=True, 
            how='left'
        )
        
        # Écarts par rapport aux moyennes famille
        features['ecart_prix_famille'] = (
            features['prix_vente'] - features['prix_vente_famille_avg']
        ) / features['prix_vente_famille_avg'].replace(0, np.nan)
        
        features['ecart_marge_famille'] = (
            features['marge_percent'] - features['marge_percent_famille_avg']
        )
        
        # Sélection des features numériques pour ML
        numeric_features = [
            'log_prix_vente', 'log_prix_achat', 'log_stock', 'log_ventes',
            'marge_percent', 'ratio_prix_achat_vente', 'rotation_stock',
            'qualite_encoded', 'ecart_prix_famille', 'ecart_marge_famille'
        ]
        
        ml_features = features[numeric_features].fillna(0)
        
        # Normalisation
        ml_features_scaled = pd.DataFrame(
            self.scaler.fit_transform(ml_features),
            columns=ml_features.columns,
            index=ml_features.index
        )
        
        return ml_features_scaled
    
    async def _detect_anomalies(self, features_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Détecte les anomalies avec Isolation Forest"""
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
    
    async def _perform_clustering(self, features_df: pd.DataFrame) -> List[int]:
        """Clustering pour segmentation des produits"""
        clusters = self.clusterer.fit_predict(features_df)
        
        # Analyser les clusters
        unique_clusters = set(clusters)
        cluster_analysis = {}
        
        for cluster_id in unique_clusters:
            if cluster_id == -1:  # Points de bruit
                continue
                
            cluster_mask = clusters == cluster_id
            cluster_data = features_df[cluster_mask]
            
            cluster_analysis[cluster_id] = {
                "size": int(cluster_mask.sum()),
                "centroid": cluster_data.mean().to_dict()
            }
        
        logger.info(f"🎯 Clustering: {len(unique_clusters)} clusters identifiés")
        return clusters.tolist()
    
    async def _analyze_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyse des tendances de pricing"""
        trends = {
            "global_stats": {
                "avg_margin": float(df['marge_percent'].mean()),
                "median_price": float(df['prix_vente'].median()),
                "high_margin_products": int((df['marge_percent'] > 50).sum()),
                "low_margin_products": int((df['marge_percent'] < 10).sum()),
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
            trends["by_quality"][qualite] = {
                "count": len(subset),
                "avg_price": float(subset['prix_vente'].mean()),
                "avg_margin": float(subset['marge_percent'].mean())
            }
        
        # Top/Flop familles par marge
        famille_margins = df.groupby('famille')['marge_percent'].mean().sort_values(ascending=False)
        trends["by_family"] = {
            "top_margin_families": famille_margins.head(5).to_dict(),
            "low_margin_families": famille_margins.tail(5).to_dict()
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
        if len(high_anomalies) > 5:
            recommendations.append({
                "type": "anomaly_correction",
                "priority": "high",
                "title": f"Corriger {len(high_anomalies)} anomalies critiques",
                "description": "Des incohérences majeures de pricing ont été détectées",
                "action": "review_pricing_rules",
                "affected_products": len(high_anomalies)
            })
        
        # 2. Recommandations sur les marges
        low_margin_products = df[df['marge_percent'] < 10]
        if len(low_margin_products) > 0:
            avg_low_margin = low_margin_products['marge_percent'].mean()
            recommendations.append({
                "type": "margin_optimization",
                "priority": "medium",
                "title": f"Optimiser {len(low_margin_products)} produits à faible marge",
                "description": f"Marge moyenne: {avg_low_margin:.1f}% (< 10%)",
                "action": "increase_prices",
                "potential_impact": f"+{len(low_margin_products) * 50}€/mois estimé"
            })
        
        # 3. Recommandations sur les stocks morts
        dead_stock = df[(df['qte_vendue_12m'] == 0) & (df['stock_actuel'] > 0)]
        if len(dead_stock) > 0:
            recommendations.append({
                "type": "inventory_optimization",
                "priority": "medium",
                "title": f"Gérer {len(dead_stock)} références sans ventes",
                "description": "Stock immobilisé sans rotation",
                "action": "liquidation_or_removal",
                "affected_products": len(dead_stock)
            })
        
        # 4. Recommandations par clustering
        cluster_counts = pd.Series(clusters).value_counts()
        if -1 in cluster_counts and cluster_counts[-1] > 10:
            recommendations.append({
                "type": "segmentation",
                "priority": "low",
                "title": f"{cluster_counts[-1]} produits atypiques identifiés",
                "description": "Produits ne correspondant à aucun segment standard",
                "action": "manual_review",
                "affected_products": int(cluster_counts[-1])
            })
        
        # 5. Recommandations qualité vs prix
        quality_issues = await self._detect_quality_price_issues(df)
        if quality_issues:
            recommendations.extend(quality_issues)
        
        return sorted(recommendations, key=lambda x: {"high": 3, "medium": 2, "low": 1}[x["priority"]], reverse=True)
    
    async def _detect_quality_price_issues(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Détecte les incohérences qualité/prix"""
        issues = []
        
        # Grouper par ref_crn/famille pour comparer les qualités
        for famille in df['famille'].unique():
            if pd.isna(famille):
                continue
                
            famille_data = df[df['famille'] == famille]
            if len(famille_data) < 2:
                continue
            
            # Vérifier la cohérence OE > OEM > PMQ > PMV
            quality_order = {'OE': 4, 'OEM': 3, 'PMQ': 2, 'PMV': 1}
            for _, row in famille_data.iterrows():
                same_ref = famille_data[famille_data['refint'] == row['refint']]
                if len(same_ref) < 2:
                    continue
                
                # Chercher des inversions de prix/qualité
                for _, other_row in same_ref.iterrows():
                    if row.name == other_row.name:
                        continue
                    
                    row_quality_rank = quality_order.get(row['qualite'], 0)
                    other_quality_rank = quality_order.get(other_row['qualite'], 0)
                    
                    # Si qualité supérieure mais prix inférieur = problème
                    if (row_quality_rank > other_quality_rank and 
                        row['prix_vente'] < other_row['prix_vente']):
                        
                        issues.append({
                            "type": "quality_price_inversion",
                            "priority": "high",
                            "title": f"Inversion qualité/prix détectée",
                            "description": f"{row['qualite']} moins cher que {other_row['qualite']} pour {row['refint']}",
                            "action": "adjust_pricing",
                            "cod_pro_1": int(row['cod_pro']),
                            "cod_pro_2": int(other_row['cod_pro'])
                        })
        
        return issues
    
    async def _calculate_quality_score(self, df: pd.DataFrame, anomalies: List[Dict]) -> Dict[str, Any]:
        """Calcule un score de qualité global du pricing"""
        total_products = len(df)
        anomaly_rate = len(anomalies) / total_products if total_products > 0 else 0
        
        # Métriques de qualité
        margin_quality = 1 - (df['marge_percent'] < 0).sum() / total_products
        consistency_quality = 1 - anomaly_rate
        rotation_quality = (df['qte_vendue_12m'] > 0).sum() / total_products
        
        overall_score = (margin_quality + consistency_quality + rotation_quality) / 3
        
        return {
            "overall_score": round(overall_score * 100, 1),
            "margin_quality": round(margin_quality * 100, 1),
            "consistency_quality": round(consistency_quality * 100, 1),
            "rotation_quality": round(rotation_quality * 100, 1),
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