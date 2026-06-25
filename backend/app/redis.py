import secrets
import uuid

import redis.asyncio as aioredis

from app.config import get_settings

_settings = get_settings()
_client: aioredis.Redis = aioredis.from_url(_settings.redis_url, decode_responses=True)


async def get_redis() -> aioredis.Redis:
    return _client


def _key(sid: str) -> str:
    return f"session:{sid}"


async def create_session(redis: aioredis.Redis, user_id: uuid.UUID) -> str:
    sid = secrets.token_urlsafe(32)
    await redis.set(_key(sid), str(user_id), ex=get_settings().session_ttl_seconds)
    return sid


async def get_session_user_id(redis: aioredis.Redis, sid: str) -> uuid.UUID | None:
    raw = await redis.get(_key(sid))
    return uuid.UUID(raw) if raw else None


async def delete_session(redis: aioredis.Redis, sid: str) -> None:
    await redis.delete(_key(sid))
