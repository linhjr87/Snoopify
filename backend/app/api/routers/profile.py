from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.profile import ProfileOut
from app.services import profile as svc

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
async def get_profile(session: SessionDep, user: CurrentUserDep):
    return await svc.get_profile(session, user)
