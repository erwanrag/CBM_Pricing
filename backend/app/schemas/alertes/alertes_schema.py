
#backend/app/schemas/alertes_schema.py

from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime

class ParametrageRegleSchema(BaseModel):
    code_regle: str
    libelle_regle: str
    categorie: str
    est_active: bool
    criticite: Optional[int]
    seuil_1: Optional[float]
    seuil_2: Optional[float]
    unite: Optional[str]

class AlertesSummaryRequest(BaseModel):
    page: int = 1
    limit: int = Field(100, le=200)
    code_regle: Optional[str] = None
    sort_by: Optional[str] = "ca_total"
    sort_dir: Optional[str] = "desc"
    refint: Optional[str] = None
    no_tarif: Optional[int] = None

    # 🆕 Filtres dynamiques
    cod_pro: Optional[int] = None
    ref_crn: Optional[str] = None
    grouping_crn: Optional[int] = 0
    qualite: Optional[str] = None
    force_single: Optional[bool] = False
    export_all: Optional[bool] = False
    
    @model_validator(mode="before")
    def override_limit_if_export_all(cls, values: dict) -> dict:
        if values.get("export_all"):
            values["limit"] = 999_999
            values["page"] = 0
        return values

class AlertesSyntheseItem(BaseModel):
    cod_pro: int
    refint: str
    qualite: str
    grouping_crn: int
    statut: int
    no_tarif: int
    nb_alertes: Optional[int]
    regles: str
    nb_QLT_09: Optional[int]
    nb_FIN_01: Optional[int]
    nb_FIN_02: Optional[int]
    nb_TAR_01: Optional[int]
    ca_total: float
    date_detection: datetime
    px_vente: Optional[float]
    px_achat: Optional[float]
    marge_relative: Optional[float]
    ca_LM: Optional[float]
    qte_LM: Optional[int]
    marge_LM: Optional[float]
    pmp_LM: Optional[float]
    stock_LM: Optional[float]

class AlertesSummaryPaginatedResponse(BaseModel):
    total: int
    rows: List[AlertesSyntheseItem]

class AlertesDetailItem(BaseModel):
    id_alerte: int
    code_regle: str
    cod_pro: int
    refint: str
    qualite: str
    grouping_crn: int
    ref_crn: Optional[str]
    no_tarif: int
    valeur_reference: Optional[float]
    valeur_comparee: Optional[float]
    unite: Optional[str]
    details_declenchement: Optional[str]
    date_detection: datetime
    statut_utilisateur: Optional[str]
    commentaire_utilisateur: Optional[str]
    criticite: int
    est_active: bool
    libelle_regle: str
    categorie: str
    message_standard: Optional[str]
    seuil_1: Optional[float]
    seuil_2: Optional[float]
    type_comparaison: Optional[str]
    requiert_details: Optional[bool]

class AlertesMapRequest(BaseModel):
    no_tarif: int
    cod_pro_list: List[int]
