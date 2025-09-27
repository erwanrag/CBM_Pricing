#backend/app/db/dependencies.py

from app.db.session import get_session  # OK : vient de database.py
from sqlalchemy.ext.asyncio import AsyncSession

# Pour compatibilité éventuelle avec routers qui utilisent get_db
async def get_db() -> AsyncSession:
    async for session in get_session():
        yield session
