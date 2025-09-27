# backend/app/schemas/produits/suggestion_schema.py
from pydantic import BaseModel

class RefintCodproSuggestion(BaseModel):
    refint: str
    cod_pro: int
