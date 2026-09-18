from __future__ import annotations

import os
from pathlib import Path

import asyncpg


def database_url() -> str:
    return os.environ.get(
        "DATABASE_URL",
        "postgresql://taskoffloading:taskoffloading@localhost:5432/taskoffloading",
    ).replace("postgresql+asyncpg://", "postgresql://")


async def connect() -> asyncpg.Pool:
    return await asyncpg.create_pool(database_url(), min_size=1, max_size=5)


async def apply_schema(pool: asyncpg.Pool) -> None:
    schema_path = Path(__file__).parent.parent / "db" / "schema.sql"
    async with pool.acquire() as connection:
        await connection.execute(schema_path.read_text())
