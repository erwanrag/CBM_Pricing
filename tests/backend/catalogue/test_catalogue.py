# 📄 tests/backend/test_catalogue.py
import pytest
from backend.app.services.catalogue_tarif.catalogue_tarif_service import get_catalogue_tarifs
from  tests.backend.utils.factories import make_catalogue_tarif_request

@pytest.mark.asyncio
async def test_get_catalogue_tarifs(db_session):
    filters = make_catalogue_tarif_request()
    result = await get_catalogue_tarifs(filters.model_dump(), db_session, page=0, limit=10)
    assert "rows" in result