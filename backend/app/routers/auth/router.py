# 📄 backend/app/routers/auth/router.py

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import timedelta
from app.common.logger import logger

from app.main import limiter
from app.db.session import get_session
from app.schemas.auth.auth_schema import ResetRequest, CodeVerification, PasswordReset
from app.services.auth.auth_service import get_current_user
from app.schemas.auth.user_schema import UserInDB as User
from app.services.auth.auth_service import (
    authenticate_user,
    create_access_token,
    get_password_hash
)
from app.settings import get_settings

settings = get_settings()
access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

auth_router = APIRouter(prefix="/auth", tags=["Authentification"])

# Route login, conserver telle quelle
@auth_router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_session)
):
    try:
        logger.info(f"🔐 Tentative login : {form_data.username}")
        user = await authenticate_user(db, form_data.username, form_data.password)
        if not user:
            logger.warning(f"❌ Login refusé : {form_data.username}")
            raise HTTPException(status_code=400, detail="Email ou mot de passe invalide")

        access_token = create_access_token(
            data={"sub": user.email, "role": user.role},
            expires_delta=access_token_expires
        )

        logger.success(f"✅ Connexion réussie : {user.email}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "email": user.email,
            "role": user.role
        }

    except Exception:
        logger.exception(f"💥 ERREUR login {form_data.username}")
        raise HTTPException(status_code=500, detail="Erreur login")


@auth_router.post("/request-reset")
@limiter.limit("3/minute")
async def request_reset(request: Request, data: ResetRequest, db: AsyncSession = Depends(get_session)):
    try:
        await db.execute(
            text("EXEC [Pricing].[Proc_SendResetCodeByEmail] @Email = :email"),
            {"email": data.email}
        )
        await db.commit()
        return {"message": f"Code envoyé à {data.email}"}
    except Exception:
        logger.exception(f"💥 ERREUR envoi email pour reset")
        raise HTTPException(status_code=500, detail="Erreur envoi email")


@auth_router.post("/verify-reset-code")
@limiter.limit("3/minute")
async def verify_code(request: Request, data: CodeVerification, db: AsyncSession = Depends(get_session)):
    result = await db.execute(text("""
        SELECT * FROM CBM_DATA.Pricing.Auth_reset_codes
        WHERE email = :email AND code = :code AND expiration > GETDATE()
    """), {"email": data.email, "code": data.code})
    row = result.mappings().fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")
    return {"message": "Code valide"}


@auth_router.post("/reset-password")
@limiter.limit("3/minute")
async def reset_password(request: Request, data: PasswordReset, db: AsyncSession = Depends(get_session)):
    result = await db.execute(text("""
        SELECT * FROM CBM_DATA.Pricing.Auth_reset_codes
        WHERE email = :email AND code = :code AND expiration > GETDATE()
    """), {"email": data.email, "code": data.code})
    row = result.mappings().fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")

    new_hashed = get_password_hash(data.new_password)
    await db.execute(text("""
        UPDATE CBM_DATA.pricing.auth_users
        SET hashed_password = :hpw
        WHERE email = :email
    """), {"hpw": new_hashed, "email": data.email})

    await db.execute(text("""
        DELETE FROM CBM_DATA.pricing.auth_reset_codes
        WHERE email = :email
    """), {"email": data.email})

    await db.commit()
    return {"message": "Mot de passe réinitialisé avec succès"}


@auth_router.get("/me")
@limiter.limit("3/minute")
async def get_me(request: Request, current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "role": current_user.role}
