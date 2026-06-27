import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import case, func, select

from app.config import get_settings
from app.db.models import Card, Deck, ReviewLog, User
from app.enums import CEFR_LEVELS
from app.schemas.profile import Achievement, ProfileOut, ProfileStats, ProfileUpdate
from app.services.srs import mastery


def _tz() -> ZoneInfo:
    return ZoneInfo(get_settings().app_timezone)


async def _mastery_counts(session, user_id: uuid.UUID) -> dict:
    cards = (
        await session.execute(select(Card).join(Deck).where(Deck.user_id == user_id))
    ).scalars().all()
    counts = {"new": 0, "learning": 0, "proficient": 0}
    for c in cards:
        counts[mastery(c.repetitions, c.interval_days)] += 1
    return counts


async def _accuracy(session, user_id: uuid.UUID) -> int:
    row = (
        await session.execute(
            select(
                func.count().label("total"),
                func.coalesce(func.sum(case((ReviewLog.is_correct.is_(True), 1), else_=0)), 0).label("correct"),
            )
            .select_from(ReviewLog)
            .join(Card, ReviewLog.card_id == Card.id)
            .join(Deck, Card.deck_id == Deck.id)
            .where(Deck.user_id == user_id)
            .where(ReviewLog.is_correct.is_not(None))
        )
    ).one()
    total = row.total or 0
    return round(100 * row.correct / total) if total else 0


async def _review_dates(session, user_id: uuid.UUID) -> list:
    rows = (
        await session.execute(
            select(ReviewLog.reviewed_at)
            .join(Card, ReviewLog.card_id == Card.id)
            .join(Deck, Card.deck_id == Deck.id)
            .where(Deck.user_id == user_id)
        )
    ).scalars().all()
    tz = _tz()
    return sorted({dt.astimezone(tz).date() for dt in rows})


def _current_streak(dateset: set, today) -> int:
    streak = 0
    cursor = today
    while cursor in dateset:
        streak += 1
        cursor = cursor - timedelta(days=1)
    return streak


def _longest_streak(dates: list) -> int:
    longest = run = 0
    prev = None
    for d in dates:
        run = run + 1 if prev is not None and (d - prev).days == 1 else 1
        longest = max(longest, run)
        prev = d
    return longest


def _achievements(mastered: int, longest: int, distinct_days: int, level: str) -> list[Achievement]:
    level_rank = CEFR_LEVELS.index(level) if level in CEFR_LEVELS else 0
    b2_rank = CEFR_LEVELS.index("B2")
    flags = {
        "streak7": longest >= 7,
        "mastered100": mastered >= 100,
        "sessions10": distinct_days >= 10,
        "streak30": longest >= 30,
        "mastered500": mastered >= 500,
        "b2": level_rank >= b2_rank,
    }
    order = ["streak7", "mastered100", "sessions10", "streak30", "mastered500", "b2"]
    return [Achievement(key=k, earned=flags[k]) for k in order]


async def update_profile(session, user: User, data: ProfileUpdate) -> ProfileOut:
    clash = (
        await session.execute(
            select(User).where(User.username == data.username, User.id != user.id)
        )
    ).scalar_one_or_none()
    if clash is not None:
        raise HTTPException(status_code=409, detail="Username already taken")
    user.display_name = data.display_name
    user.username = data.username
    user.level = data.level
    user.level_target = data.level_target
    user.goal_text = data.goal_text
    user.daily_target = data.daily_target
    await session.commit()
    await session.refresh(user)
    return await get_profile(session, user)


async def get_profile(session, user: User) -> ProfileOut:
    counts = await _mastery_counts(session, user.id)
    learned = counts["learning"] + counts["proficient"]
    mastered = counts["proficient"]
    accuracy = await _accuracy(session, user.id)

    dates = await _review_dates(session, user.id)
    dateset = set(dates)
    today = datetime.now(_tz()).date()
    streak = _current_streak(dateset, today)
    longest = _longest_streak(dates)
    distinct_days = len(dates)

    return ProfileOut(
        display_name=user.display_name,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
        level=user.level,
        level_target=user.level_target,
        goal_text=user.goal_text,
        daily_target=user.daily_target,
        stats=ProfileStats(learned=learned, mastered=mastered, streak=streak, accuracy=accuracy),
        achievements=_achievements(mastered, longest, distinct_days, user.level),
    )
