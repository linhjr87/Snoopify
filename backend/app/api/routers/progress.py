from fastapi import APIRouter, HTTPException, Query

from app.api.deps import SessionDep
from app.schemas.card import CardOut
from app.schemas.progress import HeatmapOut, NeedsReviewItem, ProgressSummaryOut, WordOfDayOut
from app.services import progress as svc

progress_router = APIRouter(prefix="/progress", tags=["progress"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])
cards_extra_router = APIRouter(prefix="/cards", tags=["cards"])


@progress_router.get("/summary", response_model=ProgressSummaryOut)
async def summary(session: SessionDep):
    return await svc.summary(session)


@progress_router.get("/heatmap", response_model=HeatmapOut)
async def heatmap(session: SessionDep):
    return await svc.heatmap(session)


@progress_router.get("/needs-review", response_model=list[NeedsReviewItem])
async def needs_review(session: SessionDep, limit: int = Query(default=10, ge=1, le=50)):
    return await svc.needs_review(session, limit)


@dashboard_router.get("/word-of-day", response_model=WordOfDayOut)
async def word_of_day(session: SessionDep):
    result = await svc.word_of_day(session)
    if result is None:
        raise HTTPException(status_code=404, detail="No cards yet")
    return result


@cards_extra_router.get("/recent", response_model=list[CardOut])
async def recent(session: SessionDep, limit: int = Query(default=3, ge=1, le=20)):
    return await svc.recent_cards(session, limit)
