import uuid

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.schemas.review import GradeRequest, GradeResult, ReviewItemOut
from app.services import review as svc

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/session", response_model=list[ReviewItemOut])
async def get_session(
    session: SessionDep,
    deck_id: uuid.UUID | None = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    return await svc.assemble_session(session, deck_id, limit)


@router.post("/grade", response_model=GradeResult)
async def grade(req: GradeRequest, session: SessionDep):
    return await svc.grade_card(session, req)
