from typing import Optional, Dict, List
from pydantic import BaseModel, Field, model_validator

class ComparatifFilterRequest(BaseModel):
    tarifs: List[int]
    cod_pro: Optional[int] = None
    ref_crn: Optional[str] = None
    refint: Optional[str] = None
    grouping_crn: Optional[int] = 0
    qualite: Optional[str] = None
    force_single: Optional[bool] = False
    sort_by: Optional[str] = "cod_pro"
    sort_dir: Optional[str] = "asc"
    page: Optional[int] = 1
    limit: Optional[int] = Field(100, ge=1)
    export_all: Optional[bool] = False

    @model_validator(mode="before")
    def override_limit_if_export_all(cls, values: dict) -> dict:
        if values.get("export_all"):
            values["limit"] = 999_999
            values["page"] = 1  # Correction: page 1 pour export
        else:
            if values.get("limit", 100) > 200:
                values["limit"] = 200
        return values

class TarifValue(BaseModel):
    prix: Optional[float]
    marge: Optional[float]
    qte: Optional[int]
    ca: Optional[float]
    marge_realisee: Optional[float]

# Nouvelles métadonnées pour optimisation performance
class ComparatifMeta(BaseModel):
    has_more: bool = False
    prefetch_size: int = 20
    performance_mode: bool = False
    cached: bool = False

class TarifComparatifMultiResponse(BaseModel):
    cod_pro: int
    refint: str
    nom_pro: str
    qualite: str
    statut: int
    prix_achat: Optional[float]  
    pmp_LM: Optional[float]
    stock_LM: Optional[int]
    ca_LM: Optional[float]
    qte_LM: Optional[int]
    marge_LM: Optional[float]
    tarifs: Dict[str, TarifValue]
    ratio_max_min: Optional[float] = None

class ComparatifMultiResponseList(BaseModel):
    total: int
    rows: List[TarifComparatifMultiResponse]
    meta: Optional[ComparatifMeta] = None  # Nouvelles métadonnées