#backend/app/db/engine.py

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import URL
from sqlalchemy.exc import OperationalError
from sqlalchemy import text  # Manquait ici
from app.settings import get_settings
from app.common.logger import logger  # 💥 Corrige l'erreur d'import


settings = get_settings()

DATABASE_PARAMS = {
    "DRIVER": "{ODBC Driver 17 for SQL Server}",
    "SERVER": settings.SQL_SERVER,
    "DATABASE": settings.SQL_DATABASE,
    "UID": settings.SQL_USER,
    "PWD": settings.SQL_PASSWORD,
    "TrustServerCertificate": "yes"
}

connection_string = ";".join([f"{k}={v}" for k, v in DATABASE_PARAMS.items()])
async_url = URL.create("mssql+aioodbc", query={"odbc_connect": connection_string})

engine = create_async_engine(
    async_url,
    echo=False,
    future=True,
    pool_size=50,
    max_overflow=5,
    pool_timeout=5,
    pool_pre_ping=True
)

async def test_db_connection():
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        return False
