# 📄 backend/app/routers/logs/router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.services.auth.auth_service import get_current_user
from app.schemas.logs.log_modification_schema import LogModificationEntry
from app.services.logs.log_modification_service import (
    log_modifications_in_db,
    fetch_modification_history_paginated
)
from app.db.session import get_session
from app.common.logger import logger

log_router = APIRouter(tags=["Modifications"])

@log_router.post("/tarifs/log-modifications")
async def log_modifications(
    entries: List[LogModificationEntry],
    db: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user)
):
    try:
        await log_modifications_in_db(entries, db, user["email"])
        return {"message": f"{len(entries)} modification(s) enregistrées avec succès."}
    except Exception:
        logger.exception("Erreur enregistrement modifications")
        raise HTTPException(status_code=500, detail="Erreur enregistrement modifications")

@log_router.get("/tarifs/historique")
async def get_modification_history(
    page: int = 1,
    page_size: int = 50,
    cod_pro: Optional[int] = None,
    refint: Optional[str] = None,
    no_tarif: Optional[int] = None,
    db: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user)
):
    try:
        return await fetch_modification_history_paginated(
            db=db,
            page=page,
            page_size=page_size,
            cod_pro=cod_pro,
            refint=refint,
            no_tarif=no_tarif
        )
    except Exception:
        logger.exception("Erreur récupération historique modifications")
        raise HTTPException(status_code=500, detail="Erreur récupération historique")



@log_router.get("/tarifs/roles/me")
async def get_user_role(user: dict = Depends(get_current_user)):
    return {"role": user["role"]}
