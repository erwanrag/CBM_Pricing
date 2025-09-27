#backend/app/schema/produits/fiche_schema.py
from pydantic import BaseModel
from typing import Optional, List

# Pour analyse individuelle (SP)
class ProductDetailRequest(BaseModel):
    cod_pro: int
    no_tarif: int


# Résultat détaillé (peu importe la source)
class ProductFiche(BaseModel):
    cod_pro: int
    refint: str
    qualite: str
    famille: Optional[str]
    statut: Optional[str]
    prix_vente_tarif: Optional[float]
    prix_achat: Optional[float]
    marge_actuelle: Optional[float]
    stock_total: Optional[int]
    nb_hausses_12m: Optional[int]
    prix_vente_m3: Optional[float]
    prix_vente_m6: Optional[float]
    prix_vente_m12: Optional[float]
    qte_tarif_0_3m: Optional[int]
    ca_tarif_0_3m: Optional[float]
    marge_tarif_0_3m: Optional[float]
    qte_tarif_3_6m: Optional[int]
    ca_tarif_3_6m: Optional[float]
    marge_tarif_3_6m: Optional[float]
    qte_tarif_6_12m: Optional[int]
    ca_tarif_6_12m: Optional[float]
    marge_tarif_6_12m: Optional[float]
    qte_hors_tarif: Optional[int]
    ca_hors_tarif: Optional[float]
    marge_hors_tarif: Optional[float]
    qte_contrat: Optional[int]
    ca_contrat: Optional[float]
    marge_contrat: Optional[float]
    qte_condition: Optional[int]
    ca_condition: Optional[float]
    marge_condition: Optional[float]
