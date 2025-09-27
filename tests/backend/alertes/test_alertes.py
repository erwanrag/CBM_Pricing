# 📄 tests/backend/test_alertes.py
import pytest
from backend.app.services.alertes.alertes_service import get_parametrage_regles

@pytest.mark.asyncio
async def test_get_parametrage_regles(db_session):
    result = await get_parametrage_regles(db_session)
    assert isinstance(result, list)