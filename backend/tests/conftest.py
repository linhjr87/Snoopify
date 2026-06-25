import os

import pytest_asyncio
from fakeredis.aioredis import FakeRedis
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import models  # noqa: F401  (register models on Base.metadata)
from app.db.base import Base
from app.db.session import get_session
from app.main import app
from app.redis import get_redis

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://snoopify:snoopify@localhost:5432/snoopify_test",
)


@pytest_asyncio.fixture
async def engine():
    disable_cache = os.environ.get("DB_DISABLE_STATEMENT_CACHE", "false").lower() == "true"
    connect_args = {"statement_cache_size": 0} if disable_cache else {}
    eng = create_async_engine(TEST_DATABASE_URL, connect_args=connect_args)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def session(engine):
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        yield s


@pytest_asyncio.fixture
async def client(engine):
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as s:
            yield s

    fake = FakeRedis(decode_responses=True)
    app.dependency_overrides[get_session] = _override
    app.dependency_overrides[get_redis] = lambda: fake
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client_factory(engine):
    maker = async_sessionmaker(engine, expire_on_commit=False)
    fake = FakeRedis(decode_responses=True)

    async def _override():
        async with maker() as s:
            yield s

    app.dependency_overrides[get_session] = _override
    app.dependency_overrides[get_redis] = lambda: fake
    transport = ASGITransport(app=app)
    created = []

    async def _make():
        c = AsyncClient(transport=transport, base_url="http://test")
        created.append(c)
        return c

    yield _make
    for c in created:
        await c.aclose()
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_client(client):
    payload = {"email": "a@example.com", "password": "s3cret!", "display_name": "A"}
    res = await client.post("/auth/register", json=payload)
    assert res.status_code == 201, res.text
    return client, res.json()
