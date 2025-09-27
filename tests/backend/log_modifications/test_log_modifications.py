# 📄 tests/backend/test_log_modifications.py
import pytest
from backend.app.services.logs.log_modification_service import log_modifications_in_db, fetch_modification_history_paginated
from tests.backend.utils.factories import make_log_modification_entry

@pytest.mark.asyncio
async def test_log_modifications_and_fetch(db_session):
    entry = make_log_modification_entry()
    await log_modifications_in_db([entry], db_session, user_email="test@cbm.fr")
    result = await fetch_modification_history_paginated(db_session)
    assert "rows" in result