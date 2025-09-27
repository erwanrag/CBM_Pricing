# backend/app/settings.py

from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    CBM_ENV: str = "dev"
    SQL_SERVER: str
    SQL_DATABASE: str
    SQL_USER: str
    SQL_PASSWORD: str
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    DATABASE_URL: str
    SECRET_KEY: str
    VITE_ENV: str = "prod" # <- Choisit selon une variable d'env
    VITE_API_URL: str = "http://127.0.0.1:8001"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    cbm_log_dir: str = "./logs"
    ALGORITHM: str = "HS256"
    FRONTEND_PORTS: str = "3010,5174"
    FRONTEND_HOST: str = "10.103.3.11"


    class Config:
        env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env.prod")  # <- Choisit selon une variable d'env
        env_file_encoding = 'utf-8'

@lru_cache()
def get_settings():
    return Settings()
