# backend/tests/utils/factories.py
from typing import Dict, Any, List
import random
from datetime import datetime, timedelta
from app.schemas.catalogue_tarif_schema import CatalogueTarifRequest
from app.schemas.product_filter_schema import ProductFilterRequest
from app.schemas.comparatif_multi_schema import ComparatifMultiRequest

class TestDataFactory:
    """Factory pour générer des données de test cohérentes"""
    
    @staticmethod
    def random_cod_pro() -> int:
        """Génère un cod_pro aléatoire"""
        return random.randint(100000, 999999)
    
    @staticmethod
    def random_refint() -> str:
        """Génère une refint aléatoire"""
        return f"REF{random.randint(1000, 9999)}"
    
    @staticmethod
    def random_prix() -> float:
        """Génère un prix aléatoire"""
        return round(random.uniform(10.0, 1000.0), 2)

# === Factories pour les requêtes ===
def make_catalogue_tarif_request(**kwargs) -> CatalogueTarifRequest:
    """Factory pour CatalogueTarifRequest"""
    defaults = {
        "no_tarif": 42,
        "qualite": "OEM",
        "famille": None,
        "s_famille": None,
        "refint": None,
        "cod_pro": None,
        "statut": 1,
        "prix_min": None,
        "prix_max": None,
        "show_zero_price": False
    }
    defaults.update(kwargs)
    return CatalogueTarifRequest(**defaults)

def make_product_filter_request(**kwargs) -> ProductFilterRequest:
    """Factory pour ProductFilterRequest"""
    defaults = {
        "cod_pro": None,
        "ref_crn": "CRN123",
        "grouping_crn": 0
    }
    defaults.update(kwargs)
    return ProductFilterRequest(**defaults)

def make_comparatif_multi_request(**kwargs) -> ComparatifMultiRequest:
    """Factory pour ComparatifMultiRequest"""
    defaults = {
        "tarifs": [7, 42],
        "cod_pro": None,
        "refint": None,
        "qualite": None,
        "sort_field": "cod_pro",
        "sort_dir": "asc"
    }
    defaults.update(kwargs)
    return ComparatifMultiRequest(**defaults)

# === Factories pour les modèles de base ===
def make_tarif_data(**kwargs) -> Dict[str, Any]:
    """Factory pour données de tarif"""
    defaults = {
        "no_tarif": 42,
        "lib_tarif": "Tarif Test",
        "actif": True,
        "date_creation": datetime.now(),
        "date_maj": datetime.now()
    }
    defaults.update(kwargs)
    return defaults

def make_produit_data(**kwargs) -> Dict[str, Any]:
    """Factory pour données de produit"""
    defaults = {
        "cod_pro": TestDataFactory.random_cod_pro(),
        "refint": TestDataFactory.random_refint(),
        "nom_pro": "Produit Test",
        "qualite": random.choice(["OE", "OEM", "PMQ", "PMV"]),
        "famille": "Famille Test",
        "s_famille": "Sous-famille Test",
        "statut": 1,
        "no_tarif": 42
    }
    defaults.update(kwargs)
    return defaults

def make_prix_data(**kwargs) -> Dict[str, Any]:
    """Factory pour données de prix"""
    defaults = {
        "cod_pro": TestDataFactory.random_cod_pro(),
        "no_tarif": 42,
        "prix_vente": TestDataFactory.random_prix(),
        "prix_achat": TestDataFactory.random_prix(),
        "date_debut": datetime.now() - timedelta(days=30),
        "date_fin": None
    }
    defaults.update(kwargs)
    return defaults

def make_alerte_data(**kwargs) -> Dict[str, Any]:
    """Factory pour données d'alerte"""
    defaults = {
        "regle_id": "R03",
        "description": "PMQ < 75% OEM",
        "cod_pro": TestDataFactory.random_cod_pro(),
        "valeur_actuelle": 0.65,
        "seuil": 0.75,
        "statut": "ACTIVE",
        "date_detection": datetime.now(),
        "priorite": "MEDIUM"
    }
    defaults.update(kwargs)
    return defaults

def make_log_modification_entry(**kwargs) -> Dict[str, Any]:
    """Factory pour entrées de log de modification"""
    defaults = {
        "cod_pro": TestDataFactory.random_cod_pro(),
        "no_tarif": 42,
        "action": "UPDATE_PRIX",
        "ancienne_valeur": 100.0,
        "nouvelle_valeur": 110.0,
        "utilisateur": "test@cbm.fr",
        "timestamp": datetime.now(),
        "details": "Test modification"
    }
    defaults.update(kwargs)
    return defaults

# === Builders pour données complexes ===
class TarifBuilder:
    """Builder pattern pour créer des tarifs complets avec relations"""
    
    def __init__(self):
        self.data = make_tarif_data()
        self.produits = []
        self.prix = []
    
    def with_tarif(self, **kwargs):
        self.data.update(kwargs)
        return self
    
    def with_produits(self, count: int = 3):
        for _ in range(count):
            produit = make_produit_data(no_tarif=self.data["no_tarif"])
            self.produits.append(produit)
        return self
    
    def with_prix(self):
        for produit in self.produits:
            prix = make_prix_data(
                cod_pro=produit["cod_pro"],
                no_tarif=self.data["no_tarif"]
            )
            self.prix.append(prix)
        return self
    
    def build(self) -> Dict[str, Any]:
        return {
            "tarif": self.data,
            "produits": self.produits,
            "prix": self.prix
        }

# === Helpers pour datasets volumineux ===
def generate_large_dataset(count: int = 1000) -> List[Dict[str, Any]]:
    """Génère un grand dataset pour les tests de performance"""
    dataset = []
    for i in range(count):
        builder = TarifBuilder().with_tarif(no_tarif=i+1).with_produits(5).with_prix()
        dataset.append(builder.build())
    return dataset

# === Fixtures de performance ===
def make_performance_test_data():
    """Données pour tester les performances avec 120k références"""
    return {
        "total_products": 120000,
        "tarifs_count": 36,
        "depots_count": 15,
        "batch_size": 1000,
        "concurrent_users": 50
    }