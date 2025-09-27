# 📄 backend/app/routers/alertes/alertes.py
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.main import limiter
from app.db.dependencies import get_db
from app.schemas.alertes.alertes_schema import (
    ParametrageRegleSchema,
    AlertesSummaryRequest,
    AlertesSummaryPaginatedResponse,
    AlertesDetailItem,
    AlertesMapRequest
)
from app.services.alertes.alertes_service import (
    get_parametrage_regles,
    get_alertes_summary,
    get_alertes_details,
    get_alertes_map
)

alertes_router = APIRouter(
    prefix="/alertes",
    tags=["Alertes"]
)


@alertes_router.get(
    "/parametrage",
    response_model=List[ParametrageRegleSchema],
    status_code=status.HTTP_200_OK
)
async def fetch_parametrage_alertes(db: AsyncSession = Depends(get_db)):
    """
    Retourne la configuration des règles d'alertes actives.
    """
    return await get_parametrage_regles(db)


@alertes_router.post(
    "/summary",
    response_model=AlertesSummaryPaginatedResponse,
    status_code=status.HTTP_200_OK
)
async def fetch_alertes_summary(
    payload: AlertesSummaryRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Retourne une synthèse paginée des alertes par produit.
    """
    return await get_alertes_summary(payload, db)


@alertes_router.get(
    "/details",
    response_model=List[AlertesDetailItem],
    status_code=status.HTTP_200_OK
)
async def fetch_alertes_details(
    cod_pro: int = Query(..., description="Code produit CBM"),
    no_tarif: int = Query(..., description="Numéro de tarif"),
    db: AsyncSession = Depends(get_db)
):
    """
    Détail des alertes pour un produit et un tarif donné.
    """
    return await get_alertes_details(cod_pro, no_tarif, db)


@alertes_router.post(
    "/map",
    status_code=status.HTTP_200_OK
)
async def fetch_alertes_map(
    payload: AlertesMapRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Retourne une map cod_pro → champ → règles déclenchées.
    """
    return await get_alertes_map(db, payload.cod_pro_list, payload.no_tarif)
