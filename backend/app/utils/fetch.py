#backend/utils/fetch.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

async def fetch_one(db: AsyncSession, query: str, params: dict = None):
    result = await db.execute(text(query), params or {})
    return result.mappings().fetchone()

async def fetch_all(db: AsyncSession, query: str = "", params: dict = None):
    result = await db.execute(text(query), params or {})
    return result.mappings().fetchall()

async def execute(db: AsyncSession, query: str = "", params: dict = None):
    await db.execute(text(query), params or {})
    await db.commit()
