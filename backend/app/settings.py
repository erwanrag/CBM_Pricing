# backend/app/settings.py

from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    # === ENVIRONNEMENT ===
    CBM_ENV: str = "prod"
    
    # === SQL SERVER ===
    SQL_SERVER: str
    SQL_DATABASE: str
    SQL_USER: str
    SQL_PASSWORD: str
    
    # === REDIS ===
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    # === DATABASE ===
    DATABASE_URL: str
    
    # === JWT ===
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # === LOGS ===
    cbm_log_dir: str = "./logs"
    
    # === CORS FRONTEND (CRITIQUE !) ===
    FRONTEND_PORTS: str = "5173"
    FRONTEND_HOST: str = "10.103.3.11"

    class Config:
        # ✅ Charge backend/.env (dans le même dossier que main.py)
        env_file = os.path.join(os.path.dirname(__file__), "..", ".env")
        env_file_encoding = 'utf-8'
        case_sensitive = True


@lru_cache()
def get_settings():
    return Settings()