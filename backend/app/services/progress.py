import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import delete, desc, select, update

from app.config import get_settings
from app.db.models import Card, Deck, ReviewLog
from app.schemas.card import CardOut
from app.schemas.progress import (
    HeatmapOut,
    MasteryCounts,
    NeedsReviewItem,
    ProgressSummaryOut,
    WeeklyBar,
    WordOfDayOut,
)
from app.services.srs import mastery

_WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]  # Mon..Sun (FE labels)
_HEATMAP_DAYS = 126


def _tz() -> ZoneInfo:
    return ZoneInfo(get_settings().app_timezone)


async def _review_local_dates(session, user_id: uuid.UUID, since_utc: datetime) -> list:
    # ReviewLog scoped to the user via card -> deck ownership join
    rows = (
        await session.execute(
            select(ReviewLog.reviewed_at)
            .join(Card, ReviewLog.card_id == Card.id)
            .join(Deck, Card.deck_id == Deck.id)
            .where(Deck.user_id == user_id)
            .where(ReviewLog.reviewed_at >= since_utc)
        )
    ).scalars().all()
    tz = _tz()
    return [dt.astimezone(tz).date() for dt in rows]


async def summary(session, user_id: uuid.UUID) -> ProgressSummaryOut:
    tz = _tz()
    now_local = datetime.now(tz)
    today = now_local.date()

    cards = list(
        (
            await session.execute(
                select(Card).join(Deck).where(Deck.user_id == user_id)
            )
        ).scalars().all()
    )
    counts = {"new": 0, "learning": 0, "proficient": 0}
    for c in cards:
        counts[mastery(c.repetitions, c.interval_days)] += 1
    now_utc = now_local.astimezone(ZoneInfo("UTC"))
    due_total = sum(1 for c in cards if c.due_at <= now_utc)

    dates = await _review_local_dates(session, user_id, now_utc - timedelta(days=_HEATMAP_DAYS))
    per_day: dict = {}
    for d in dates:
        per_day[d] = per_day.get(d, 0) + 1

    reviews_today = per_day.get(today, 0)

    # streak: consecutive days up to today with >= 1 review
    streak = 0
    cursor = today
    while per_day.get(cursor, 0) > 0:
        streak += 1
        cursor = cursor - timedelta(days=1)

    # weekly bars: this week's Monday..Sunday
    monday = today - timedelta(days=today.weekday())
    weekly_bars = [
        WeeklyBar(label=_WEEKDAY_LABELS[i], count=per_day.get(monday + timedelta(days=i), 0))
        for i in range(7)
    ]

    return ProgressSummaryOut(
        streak=streak,
        reviews_today=reviews_today,
        mastery=MasteryCounts(**counts),
        weekly_bars=weekly_bars,
        due_total=due_total,
    )


async def heatmap(session, user_id: uuid.UUID) -> HeatmapOut:
    tz = _tz()
    today = datetime.now(tz).date()
    start = today - timedelta(days=_HEATMAP_DAYS - 1)
    dates = await _review_local_dates(
        session, user_id, datetime.now(ZoneInfo("UTC")) - timedelta(days=_HEATMAP_DAYS)
    )
    per_day: dict = {}
    for d in dates:
        per_day[d] = per_day.get(d, 0) + 1

    def bucket(n: int) -> int:
        if n == 0:
            return 0
        if n < 3:
            return 1
        if n < 6:
            return 2
        return 3

    cells = [bucket(per_day.get(start + timedelta(days=i), 0)) for i in range(_HEATMAP_DAYS)]
    return HeatmapOut(cells=cells)


async def needs_review(session, user_id: uuid.UUID, limit: int = 10) -> list[NeedsReviewItem]:
    rows = (
        await session.execute(
            select(Card)
            .join(Deck)
            .where(Deck.user_id == user_id)
            .where(Card.lapses > 0)
            .order_by(desc(Card.lapses))
            .limit(limit)
        )
    ).scalars().all()
    return [NeedsReviewItem(card_id=c.id, word=c.word, lapses=c.lapses) for c in rows]


async def word_of_day(session, user_id: uuid.UUID) -> WordOfDayOut | None:
    cards = list(
        (
            await session.execute(
                select(Card).join(Deck).where(Deck.user_id == user_id).order_by(Card.created_at)
            )
        ).scalars().all()
    )
    if not cards:
        return None
    ordinal = datetime.now(_tz()).date().toordinal()
    c = cards[ordinal % len(cards)]
    return WordOfDayOut(
        card_id=c.id, word=c.word, phonetic=c.phonetic, pos=c.pos, meaning=c.meaning, example=c.example
    )


async def recent_cards(session, user_id: uuid.UUID, limit: int = 3) -> list[CardOut]:
    rows = (
        await session.execute(
            select(Card)
            .join(Deck)
            .where(Deck.user_id == user_id)
            .order_by(desc(Card.created_at))
            .limit(limit)
        )
    ).scalars().all()
    return [CardOut.model_validate(c) for c in rows]


async def reset_progress(session, user_id: uuid.UUID) -> dict:
    # only this user's cards (ids scoped via deck ownership)
    card_ids = (
        await session.execute(
            select(Card.id).join(Deck).where(Deck.user_id == user_id)
        )
    ).scalars().all()
    await session.execute(delete(ReviewLog).where(ReviewLog.card_id.in_(card_ids)))
    await session.execute(
        update(Card)
        .where(Card.id.in_(card_ids))
        .values(
            ease_factor=2.5,
            interval_days=0,
            repetitions=0,
            lapses=0,
            last_reviewed_at=None,
            due_at=datetime.now(timezone.utc),
        )
    )
    await session.commit()
    return {"reset": len(card_ids)}
