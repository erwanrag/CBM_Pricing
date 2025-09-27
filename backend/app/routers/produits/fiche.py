# backend/app/routers/produits/fiche.py

from fastapi import APIRouter, Depends
from app.services.produits.fiche_service import fetch_product_fiche
from app.schemas.produits.fiche_schema import ProductFiche
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from typing import List

router = APIRouter(prefix="/produit", tags=["Fiche Produit"])


@router.get("/fiche", response_model=List[ProductFiche])
async def get_fiche_produit(
    no_tarif: int,
    cod_pro: int,
    db: AsyncSession = Depends(get_session)
):
    return await fetch_product_fiche(no_tarif=no_tarif, cod_pro=cod_pro, db=db)
