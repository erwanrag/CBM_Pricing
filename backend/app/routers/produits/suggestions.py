#backend/app/routers/produits/suggestions.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.dependencies import get_db
from app.services.produits.suggestion_service import (
    get_refcrn_by_codpro,
    autocomplete_refint_or_codpro,
    autocomplete_ref_crn
)
from app.schemas.produits.suggestion_schema import RefintCodproSuggestion

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])

@router.get("/refcrn")
async def suggest_ref_crn(query: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    return await autocomplete_ref_crn(query, db)

@router.get("/refint-codpro", response_model=list[RefintCodproSuggestion])
async def suggest_refint_or_codpro(query: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    return await autocomplete_refint_or_codpro(query, db)

@router.get("/refcrn_by_codpro")
async def get_refcrn_codpro(cod_pro: int, db: AsyncSession = Depends(get_db)):
    return await get_refcrn_by_codpro(cod_pro, db)
