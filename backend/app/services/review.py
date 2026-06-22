import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.models import Card
from app.schemas.review import FillOut, QuizOption, QuizOut, ReviewItemOut

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
    options_text = distinct[:3] + [correct]
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
