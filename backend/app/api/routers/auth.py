from fastapi import APIRouter, Cookie, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUserDep, RedisDep, SessionDep
from app.config import get_settings
from app.db.models import User
from app.redis import create_session, delete_session
from app.schemas.auth import LoginRequest, RegisterRequest, UserOut
from app.seed import seed_starter_deck
from app.services.auth import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_cookie(response: Response, sid: str) -> None:
    s = get_settings()
    response.set_cookie(
        "sid", sid, max_age=s.session_ttl_seconds, httponly=True,
        samesite="lax", secure=s.cookie_secure, path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, response: Response, session: SessionDep, redis: RedisDep):
    exists = (await session.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=data.email, password_hash=hash_password(data.password), display_name=data.display_name)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    await seed_starter_deck(session, user.id)
    sid = await create_session(redis, user.id)
    _set_cookie(response, sid)
    return user


@router.post("/login", response_model=UserOut)
async def login(data: LoginRequest, response: Response, session: SessionDep, redis: RedisDep):
    user = (await session.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    sid = await create_session(redis, user.id)
    _set_cookie(response, sid)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, redis: RedisDep, sid: str | None = Cookie(default=None)):
    if sid:
        await delete_session(redis, sid)
    s = get_settings()
    response.delete_cookie("sid", path="/", httponly=True, samesite="lax", secure=s.cookie_secure)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUserDep):
    return user
