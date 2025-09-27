# 📄backend/utils/factories.py

from app.schemas.log_modification_schema import LogModificationEntry
from app.schemas.product_filter_schema import ProductFilterRequest
from app.schemas.catalogue_tarif_schema import CatalogueTarifRequest

def make_log_modification_entry(**overrides):
    default = {
        "cod_pro": 123,
        "refint": "TEST123",
        "no_tarif": 42,
        "ancien_prix": 10.0,
        "nouveau_prix": 12.5,
        "ancienne_marge": 20.0,
        "marge_simulee": 30.0,
        "statut_utilisateur": "Validé",
        "commentaire_utilisateur": "Modification test"
    }
    default.update(overrides)
    return LogModificationEntry(**default)

def make_product_filter_request(**overrides):
    default = {
        "cod_pro": 123,
        "ref_crn": "RC001",
        "grouping_crn": 1,
        "qualite": "OE"
    }
    default.update(overrides)
    return ProductFilterRequest(**default)

def make_catalogue_tarif_request(**overrides):
    default = {
        "refint": "TEST123",
        "no_tarif": 42
    }
    default.update(overrides)
    return CatalogueTarifRequest(**default)
