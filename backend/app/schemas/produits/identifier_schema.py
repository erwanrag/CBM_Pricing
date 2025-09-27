#backend/app/schemas/produits/identifier_schema.py
from pydantic import BaseModel
from typing import Optional

class ProductIdentifierRequest(BaseModel):
    cod_pro: Optional[int] = None
    ref_crn: Optional[str] = None
    refint: Optional[str] = None
    grouping_crn: Optional[int] = 0
    qualite: Optional[str] = None

class CodProListResponse(BaseModel):
    cod_pro_list: list[int]
