import uuid
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.db.session import get_session
from app.redis import get_redis, get_session_user_id

SessionDep = Annotated[AsyncSession, Depends(get_session)]
RedisDep = Annotated[Redis, Depends(get_redis)]


async def get_current_user(
    session: SessionDep, redis: RedisDep, sid: str | None = Cookie(default=None)
) -> User:
    if not sid:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = await get_session_user_id(redis, sid)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Session expired")
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]
