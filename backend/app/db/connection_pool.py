# backend/app/db/connection_pool.py

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import QueuePool
from contextlib import asynccontextmanager
import asyncio
from typing import AsyncGenerator
from app.settings import get_settings
from app.common.logger import logger
from sqlalchemy import text
from sqlalchemy.engine import URL

settings = get_settings()

class OptimizedDatabasePool:
    """Pool de connexions optimisé pour haute charge"""
    
    def __init__(self):
        self.engine = None
        self.sessionmaker = None
        self._lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialisation du pool avec paramètres optimisés"""
        async with self._lock:
            if self.engine is not None:
                return
            
            connection_string = self._build_connection_string()
            
            self.engine = create_async_engine(
                connection_string,
                poolclass=QueuePool,
                pool_size=100,  # Augmenté pour 120k produits
                max_overflow=50,
                pool_timeout=30,
                pool_recycle=3600,
                pool_pre_ping=True,
                echo=False,
                query_cache_size=1200,  # Cache de requêtes compilées
                connect_args={
                    "server_settings": {
                        "jit": "on",
                        "application_name": "CBM_Pricing_Optimized"
                    },
                    "command_timeout": 60,
                    "timeout": 30
                }
            )
            
            self.sessionmaker = async_sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=False,
                autocommit=False
            )
            
            # Test de connexion immédiat
            async with self.get_session() as session:
                await session.execute(text("SELECT 1"))
                logger.info("✅ Pool de connexions optimisé initialisé")
    
    def _build_connection_string(self):
        """Construction de la chaîne avec paramètres optimisés"""
        params = {
            "DRIVER": "{ODBC Driver 17 for SQL Server}",
            "SERVER": settings.SQL_SERVER,
            "DATABASE": settings.SQL_DATABASE,
            "UID": settings.SQL_USER,
            "PWD": settings.SQL_PASSWORD,
            "TrustServerCertificate": "yes",
            "ApplicationIntent": "ReadOnly",
            "MultiSubnetFailover": "Yes",
            "ConnectTimeout": "10",
            "Encrypt": "no",  # Si réseau interne sécurisé
            "PacketSize": "32767",  # Max packet size pour grosses requêtes
            "Mars_Connection": "yes"  # Multiple Active Result Sets
        }
        
        connection_string = ";".join([f"{k}={v}" for k, v in params.items()])
        return URL.create("mssql+pyodbc", query={"odbc_connect": connection_string})

    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Context manager pour obtenir une session"""
        if self.sessionmaker is None:
            await self.initialize()
        
        async with self.sessionmaker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def test_connection(self) -> bool:
        """Vérifie que la base est accessible"""
        try:
            if self.sessionmaker is None:
                await self.initialize()
            async with self.get_session() as session:
                await session.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"❌ Échec connexion DB pool: {e}")
            return False

# Instance globale
db_pool = OptimizedDatabasePool()

# Fonction de dépendance FastAPI
async def get_optimized_db() -> AsyncGenerator[AsyncSession, None]:
    async with db_pool.get_session() as session:
        yield session
