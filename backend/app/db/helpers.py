from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

async def fetch_one(db: AsyncSession, query: str, params: dict):
    result = await db.execute(text(query), params)
    return result.mappings().first()
