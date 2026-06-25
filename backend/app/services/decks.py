import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select

from app.db.models import Deck
from app.schemas.card import CardOut
from app.schemas.deck import DeckCreate, DeckDetailOut, DeckOut, DeckUpdate
from app.services.srs import mastery


def _due_count(deck: Deck, now: datetime) -> int:
    return sum(1 for c in deck.cards if c.due_at <= now)


def _to_out(deck: Deck, now: datetime) -> DeckOut:
    cards = deck.cards
    total = len(cards)
    proficient = sum(1 for c in cards if mastery(c.repetitions, c.interval_days) == "proficient")
    mastery_pct = round(proficient / total * 100.0, 1) if total else 0.0
    reviewed = [c.last_reviewed_at for c in cards if c.last_reviewed_at is not None]
    last_reviewed_at = max(reviewed) if reviewed else None
    return DeckOut(
        id=deck.id,
        name=deck.name,
        topic=deck.topic,
        count=total,
        due_count=_due_count(deck, now),
        mastery_pct=mastery_pct,
        last_reviewed_at=last_reviewed_at,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
    )


async def _get_or_404(session, deck_id: uuid.UUID, user_id: uuid.UUID) -> Deck:
    deck = await session.get(Deck, deck_id)
    if deck is None or deck.user_id != user_id:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


async def list_decks(session, user_id: uuid.UUID) -> list[DeckOut]:
    now = datetime.now(timezone.utc)
    decks = (
        await session.execute(select(Deck).where(Deck.user_id == user_id))
    ).scalars().all()
    return [_to_out(d, now) for d in decks]


async def create_deck(session, user_id: uuid.UUID, data: DeckCreate) -> DeckOut:
    deck = Deck(name=data.name, topic=data.topic, user_id=user_id)
    session.add(deck)
    await session.commit()
    await session.refresh(deck, attribute_names=["cards"])
    return _to_out(deck, datetime.now(timezone.utc))


async def get_deck_detail(session, deck_id: uuid.UUID, user_id: uuid.UUID) -> DeckDetailOut:
    deck = await _get_or_404(session, deck_id, user_id)
    now = datetime.now(timezone.utc)
    base = _to_out(deck, now)
    return DeckDetailOut(**base.model_dump(), cards=[CardOut.model_validate(c) for c in deck.cards])


async def update_deck(session, deck_id: uuid.UUID, user_id: uuid.UUID, data: DeckUpdate) -> DeckOut:
    deck = await _get_or_404(session, deck_id, user_id)
    if data.name is not None:
        deck.name = data.name
    if data.topic is not None:
        deck.topic = data.topic
    await session.commit()
    await session.refresh(deck)  # cards stay loaded via selectin; count remains correct
    return _to_out(deck, datetime.now(timezone.utc))


async def delete_deck(session, deck_id: uuid.UUID, user_id: uuid.UUID) -> None:
    deck = await _get_or_404(session, deck_id, user_id)
    await session.delete(deck)
    await session.commit()
