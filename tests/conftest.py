# backend/tests/conftest.py
import asyncio
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from httpx import AsyncClient
from app.main import app
from app.db.database import get_db
from app.db.base_class import Base
from app.common.redis_client import redis_client
import os

# === Configuration des bases de test ===
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Crée un event loop pour toute la session de test"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def engine():
    """Engine SQLite en mémoire pour les tests"""
    engine = create_async_engine(
        TEST_DB_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
    
    # Créer les tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(engine):
    """Session de base de données pour chaque test"""
    async_session_maker = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session_maker() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db_session):
    """Client HTTP async pour tester les endpoints"""
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
async def setup_redis():
    """Setup Redis pour les tests (mock ou vrai Redis)"""
    # Option 1: Mock Redis pour tests unitaires
    if os.getenv("USE_MOCK_REDIS", "true").lower() == "true":
        from unittest.mock import AsyncMock
        redis_client.get = AsyncMock(return_value=None)
        redis_client.set = AsyncMock(return_value=True)
        redis_client.delete = AsyncMock(return_value=1)
    
    yield
    
    # Cleanup après chaque test
    try:
        if hasattr(redis_client, 'flushdb'):
            await redis_client.flushdb()
    except Exception:
        pass

# === Fixtures de données ===
@pytest.fixture
def sample_tarif_data():
    """Données de test pour les tarifs"""
    return {
        "no_tarif": 42,
        "lib_tarif": "Tarif Test",
        "cod_pro": 123456,
        "refint": "REF123",
        "qualite": "OEM",
        "prix_vente": 100.0,
        "prix_achat": 80.0
    }

@pytest.fixture
def sample_alert_data():
    """Données de test pour les alertes"""
    return {
        "regle_id": "R03",
        "description": "PMQ < 75% OEM",
        "seuil": 0.75,
        "actif": True,
        "cod_pro": 123456
    }

# === Fixtures d'environnement ===
@pytest.fixture(autouse=True)
def set_test_env():
    """Configure l'environnement de test"""
    os.environ["CBM_ENV"] = "test"
    os.environ["REDIS_TTL_SHORT"] = "10"
    os.environ["REDIS_TTL_LONG"] = "60"
    yield
    # Cleanup des variables d'environnement si nécessaire