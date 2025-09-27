# backend/app/schémas/tarifs/tarif_schema.py

from pydantic import BaseModel

class TarifFilterOption(BaseModel):
    no_tarif: int
    lib_tarif: str
