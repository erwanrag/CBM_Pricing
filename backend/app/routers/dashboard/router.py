# 📄 backend/app/routers/dashboard/router.py
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.main import limiter
from app.db.dependencies import get_db
from app.services.dashboard.dashboard_service import (
    get_dashboard_kpi,
    get_historique_prix_marge,
    get_dashboard_products,
)
from app.schemas.dashboard.dashboard_schema import (
    DashboardFilterRequest,
    DashboardKPIResponse,
    HistoriqueResponse,
    DashboardProductsPaginatedResponse,
)

dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@dashboard_router.post("/kpi", response_model=DashboardKPIResponse)
@limiter.limit("30/minute")
async def fetch_dashboard_kpi(
    request: Request,
    payload: DashboardFilterRequest,
    db: AsyncSession = Depends(get_db),
):
    return await get_dashboard_kpi(payload, db)

@dashboard_router.post("/historique", response_model=List[HistoriqueResponse])
@limiter.limit("30/minute")
async def fetch_historique_prix_marge(
    request: Request,
    payload: DashboardFilterRequest,
    db: AsyncSession = Depends(get_db),
):
    return await get_historique_prix_marge(payload, db)

@dashboard_router.post("/products", response_model=DashboardProductsPaginatedResponse)
@limiter.limit("30/minute")
async def fetch_dashboard_products(
    request: Request,
    payload: DashboardFilterRequest,
    db: AsyncSession = Depends(get_db),
    page: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    return await get_dashboard_products(payload, db, page, limit)
