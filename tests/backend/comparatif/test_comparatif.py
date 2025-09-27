# 📄 tests/backend/test_comparatif.py
import pytest
from backend.app.services.comparatif_tarif.comparatif_tarif_service import get_comparatif_tarif


@pytest.mark.asyncio
async def test_get_comparatif_tarif_minimal(db_session):
    result = await get_comparatif_tarif(tarifs=[7, 13], db=db_session, page=1, limit=5)
    assert "rows" in result