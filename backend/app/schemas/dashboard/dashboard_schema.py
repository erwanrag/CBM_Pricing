#backend/app/schemas/dashboard/dashboard_schema.py
from pydantic import BaseModel
from typing import List, Optional

class DashboardFilterRequest(BaseModel):
    no_tarif: int
    cod_pro_list: Optional[List[int]] = []
    cod_pro: Optional[int] = None
    ref_crn: Optional[str] = None
    refint: Optional[str] = None
    grouping_crn: Optional[int] = 0
    qualite: Optional[str] = None
    force_single: Optional[bool] = False  # 🆕


class DashboardKPIItem(BaseModel):
    cod_pro: int
    refint: str
    produits_actifs: int
    ca_total: float
    marge_moyenne: float
    alertes_actives: int

class DashboardKPIResponse(BaseModel):
    items: List[DashboardKPIItem]

class DashboardProductsResponse(BaseModel):
    cod_pro: int
    refint: Optional[str]
    famille: Optional[str]
    s_famille: Optional[str]
    qualite: Optional[str]
    statut: Optional[int]
    px_vente: float
    px_achat: float
    taux_marge_px: float
    ca_total: float
    marge_total: float
    qte: float
    taux_marge: float
    ca_total_le_mans: float
    marge_total_le_mans: float
    qte_le_mans: float
    taux_marge_le_mans: float
    stock_le_mans: float
    pmp_le_mans: float

class DashboardProductsPaginatedResponse(BaseModel):
    total: int
    rows: List[DashboardProductsResponse]

class HistoriqueResponse(BaseModel):
    periode: str
    cod_pro: int
    ca_mensuel: float
    marge_mensuelle: float
    qte_mensuelle : float
    marge_mensuelle_pourcentage: float
