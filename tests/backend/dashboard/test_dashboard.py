# 📄 tests/backend/test_dashboard.py
import pytest
from backend.app.services.dashboard.dashboard_service import get_dashboard_kpi

@pytest.mark.asyncio
async def test_get_dashboard_kpi(db_session):
    result = await get_dashboard_kpi(no_tarif=42, cod_pro_list=[], db=db_session)
    assert "items" in result