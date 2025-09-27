#backend/app/schemas/parametres/parametres_schema.py

from pydantic import BaseModel

class TarifParam(BaseModel):
    no_tarif: int
    visible: bool
