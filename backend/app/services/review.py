import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.models import Card, ReviewLog
from app.schemas.review import FillOut, GradeRequest, GradeResult, QuizOption, QuizOut, ReviewItemOut
from app.services import srs
from app.services.cards import get_card_or_404
from app.services.decks import _get_or_404 as get_deck_or_404

_KEYS = ["A", "B", "C", "D"]


def _hint(answer: str) -> str:
    return " ".join((w[0] + "_" * (len(w) - 1)) if w else "" for w in answer.split(" "))


def build_quiz(card, pool, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    correct = card.meaning
    seen = {correct}
    distinct: list[str] = []
    for c in pool:
        m = getattr(c, "meaning", "")
        if m and m not in seen:
            seen.add(m)
            distinct.append(m)
    rng.shuffle(distinct)
    distractors = distinct[:3]
    # guarantee exactly 4 options even when the pool has < 3 distinct distractors
    # (e.g. a tiny database); the schema contract and frontend assume keys A–D.
    while len(distractors) < 3:
        distractors.append(f"— ({len(distractors) + 1})")
    options_text = distractors + [correct]
    rng.shuffle(options_text)
    options = [{"key": _KEYS[i], "text": t} for i, t in enumerate(options_text)]
    correct_key = next(o["key"] for o in options if o["text"] == correct)
    return {"options": options, "correct_key": correct_key}


def build_fill(card) -> dict:
    word = card.word or ""
    example = card.example or ""

    def found(idx: int, target: str) -> dict:
        return {
            "before": example[:idx],
            "after": example[idx + len(target):],
            "answer": target,
            "hint": _hint(target),
        }

    if word:
        idx = example.find(word)
        if idx != -1:
            return found(idx, example[idx:idx + len(word)])
        idx = example.lower().find(word.lower())
        if idx != -1:
            return found(idx, example[idx:idx + len(word)])
        if word.lower().startswith("to "):
            base = word[3:]
            idx = example.lower().find(base.lower())
            if idx != -1:
                return found(idx, example[idx:idx + len(base)])

    # fallback: no in-sentence match -> prompt with the meaning
    return {"before": "", "after": "", "answer": word, "hint": card.meaning or _hint(word)}


def _to_item(card: Card, pool: list[Card]) -> ReviewItemOut:
    quiz = build_quiz(card, [c for c in pool if c.id != card.id])
    fill = build_fill(card)
    return ReviewItemOut(
        card_id=card.id,
        word=card.word,
        phonetic=card.phonetic,
        pos=card.pos,
        meaning=card.meaning,
        example=card.example,
        quiz=QuizOut(options=[QuizOption(**o) for o in quiz["options"]], correct_key=quiz["correct_key"]),
        fill=FillOut(**fill),
    )


async def assemble_session(session, deck_id: uuid.UUID | None, limit: int) -> list[ReviewItemOut]:
    now = datetime.now(timezone.utc)
    stmt = select(Card).where(Card.due_at <= now)
    if deck_id is not None:
        await get_deck_or_404(session, deck_id)  # 404 for a bogus deck vs. silently empty
        stmt = stmt.where(Card.deck_id == deck_id)
    stmt = stmt.order_by(Card.due_at).limit(limit)
    due = list((await session.execute(stmt)).scalars().all())

    # distractor pool: prefer same-deck cards, fall back to all cards
    pool_stmt = select(Card)
    if deck_id is not None:
        pool_stmt = pool_stmt.where(Card.deck_id == deck_id)
    pool = list((await session.execute(pool_stmt)).scalars().all())
    if len({c.meaning for c in pool}) < 4:
        pool = list((await session.execute(select(Card))).scalars().all())

    return [_to_item(c, pool) for c in due]


async def grade_card(session, req: GradeRequest) -> GradeResult:
    card = await get_card_or_404(session, req.card_id)
    new = srs.review(
        srs.Schedule(
            ease_factor=card.ease_factor,
            interval_days=card.interval_days,
            repetitions=card.repetitions,
            lapses=card.lapses,
        ),
        req.rating,
    )
    now = datetime.now(timezone.utc)
    card.ease_factor = new.ease_factor
    card.interval_days = new.interval_days
    card.repetitions = new.repetitions
    card.lapses = new.lapses
    card.last_reviewed_at = now
    card.due_at = now + timedelta(days=new.interval_days)

    session.add(ReviewLog(card_id=card.id, rating=req.rating, mode=req.mode, is_correct=req.is_correct))
    await session.commit()
    await session.refresh(card)
    return GradeResult(
        card_id=card.id,
        ease_factor=card.ease_factor,
        interval_days=card.interval_days,
        repetitions=card.repetitions,
        lapses=card.lapses,
        due_at=card.due_at,
        last_reviewed_at=card.last_reviewed_at,
    )
