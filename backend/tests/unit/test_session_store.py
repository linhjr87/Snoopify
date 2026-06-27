import uuid
import pytest
from fakeredis.aioredis import FakeRedis
from app.redis import create_session, get_session_user_id, delete_session


@pytest.mark.asyncio
async def test_session_roundtrip_and_delete():
    r = FakeRedis(decode_responses=True)
    uid = uuid.uuid4()
    sid = await create_session(r, uid)
    assert isinstance(sid, str) and len(sid) > 20
    assert await get_session_user_id(r, sid) == uid
    await delete_session(r, sid)
    assert await get_session_user_id(r, sid) is None


@pytest.mark.asyncio
async def test_unknown_sid_returns_none():
    r = FakeRedis(decode_responses=True)
    assert await get_session_user_id(r, "missing") is None
