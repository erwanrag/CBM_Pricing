#backend/app/schemas/log_modification_schema.py

from pydantic import BaseModel
from typing import Optional

class LogModificationEntry(BaseModel):
    cod_pro: int
    refint: str
    no_tarif: int
    ancien_prix: Optional[float] = None
    nouveau_prix: float
    ancienne_marge: Optional[float] = None
    marge_simulee: Optional[float] = None
    statut_utilisateur: Optional[str] = None  # ex: 'CORRIGEE', 'MAITRISEE', 'CONSERVEE'
    commentaire_utilisateur: Optional[str] = None