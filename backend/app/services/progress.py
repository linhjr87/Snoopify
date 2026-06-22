from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import desc, select

from app.config import get_settings
from app.db.models import Card, ReviewLog
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


async def _review_local_dates(session, since_utc: datetime) -> list:
    rows = (
        await session.execute(
            select(ReviewLog.reviewed_at).where(ReviewLog.reviewed_at >= since_utc)
        )
    ).scalars().all()
    tz = _tz()
    return [dt.astimezone(tz).date() for dt in rows]


async def summary(session) -> ProgressSummaryOut:
    tz = _tz()
    now_local = datetime.now(tz)
    today = now_local.date()

    cards = list((await session.execute(select(Card))).scalars().all())
    counts = {"new": 0, "learning": 0, "proficient": 0}
    for c in cards:
        counts[mastery(c.repetitions, c.interval_days)] += 1
    now_utc = now_local.astimezone(ZoneInfo("UTC"))
    due_total = sum(1 for c in cards if c.due_at <= now_utc)

    dates = await _review_local_dates(session, now_utc - timedelta(days=_HEATMAP_DAYS))
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


async def heatmap(session) -> HeatmapOut:
    tz = _tz()
    today = datetime.now(tz).date()
    start = today - timedelta(days=_HEATMAP_DAYS - 1)
    dates = await _review_local_dates(session, datetime.now(ZoneInfo("UTC")) - timedelta(days=_HEATMAP_DAYS))
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


async def needs_review(session, limit: int = 10) -> list[NeedsReviewItem]:
    rows = (
        await session.execute(
            select(Card).where(Card.lapses > 0).order_by(desc(Card.lapses)).limit(limit)
        )
    ).scalars().all()
    return [NeedsReviewItem(card_id=c.id, word=c.word, lapses=c.lapses) for c in rows]


async def word_of_day(session) -> WordOfDayOut | None:
    cards = list((await session.execute(select(Card).order_by(Card.created_at))).scalars().all())
    if not cards:
        return None
    ordinal = datetime.now(_tz()).date().toordinal()
    c = cards[ordinal % len(cards)]
    return WordOfDayOut(
        card_id=c.id, word=c.word, phonetic=c.phonetic, pos=c.pos, meaning=c.meaning, example=c.example
    )


async def recent_cards(session, limit: int = 3) -> list[CardOut]:
    rows = (
        await session.execute(select(Card).order_by(desc(Card.created_at)).limit(limit))
    ).scalars().all()
    return [CardOut.model_validate(c) for c in rows]
