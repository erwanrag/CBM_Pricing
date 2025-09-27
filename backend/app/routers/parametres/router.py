#backend/app/routers/parametres/router.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.services.parametres.parametres_service import get_all_tarifs, update_tarif_visibility
from app.schemas.parametres.parametres_schema import TarifParam
from app.db.dependencies import get_db
from app.services.auth.auth_service import require_role


router = APIRouter(prefix="/parametres", tags=["Paramètres"])

@router.get("/tarifs")
async def read_all_tarifs(db: AsyncSession = Depends(get_db)):
    return await get_all_tarifs(db)

@router.post("/tarifs")
async def update_tarifs(
    payload: List[TarifParam],
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("editor", "admin"))
):
    return await update_tarif_visibility(payload, db)

parametres_router = router
