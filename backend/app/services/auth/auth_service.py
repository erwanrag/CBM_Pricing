#backend/app/services/auth/auth_service.py

from datetime import timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from passlib.context import CryptContext

from app.schemas.auth.user_schema import UserInDB
from app.db.session import get_session
from app.db.helpers import fetch_one  # utilitaire d'accès DB simple
from app.services.auth.jwt_utils import create_access_token, decode_access_token
from app.settings import get_settings

settings = get_settings()
access_token_expiration = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
# === Auth & sécurité ===
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# === Fonctions de hash / vérif mot de passe ===
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# === Authentification utilisateur ===
async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[UserInDB]:
    query = "SELECT * FROM CBM_DATA.pricing.auth_users WHERE email = :email"
    result = await fetch_one(db, query, {"email": email})
    if not result:
        return None

    user = UserInDB(**result)

    if not user.is_active:
        return None

    if not user.hashed_password:
        # Premier login, on hash le mot de passe à la volée
        hashed = get_password_hash(password)
        await db.execute(
            text("""
                UPDATE CBM_DATA.pricing.auth_users
                SET hashed_password = :hpw
                WHERE email = :email
            """),
            {"hpw": hashed, "email": email}
        )
        await db.commit()
        return user

    if not verify_password(password, user.hashed_password):
        return None

    return user

# === Récupération de l'utilisateur via token JWT ===
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        role = payload.get("role")
        if not email or not role:
            raise credentials_exception
        return {"email": email, "role": role}
    except Exception:
        raise credentials_exception


# === Vérification de rôle (admin, user...) ===
def require_role(*roles: str):
    def wrapper(current_user=Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        return current_user
    return wrapper
