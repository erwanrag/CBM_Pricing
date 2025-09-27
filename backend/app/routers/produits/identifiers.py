#backend/app/routers/produits/identifiers.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.dependencies import get_db
from app.schemas.produits.identifier_schema import ProductIdentifierRequest, CodProListResponse
from app.services.produits.identifier_service import get_codpro_list_from_identifier

router = APIRouter(prefix="/identifiers", tags=["Filtrage identifiants"])

@router.post("/resolve-codpro", response_model=CodProListResponse)
async def resolve_codpro_list_route(
    payload: ProductIdentifierRequest,
    db: AsyncSession = Depends(get_db)
):
    cod_pro_list = await get_codpro_list_from_identifier(payload, db)
    return {"cod_pro_list": cod_pro_list}
