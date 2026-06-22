import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select

from app.db.models import Deck
from app.schemas.deck import DeckCreate, DeckDetailOut, DeckOut, DeckUpdate
from app.schemas.card import CardOut


def _due_count(deck: Deck, now: datetime) -> int:
    return sum(1 for c in deck.cards if c.due_at <= now)


def _to_out(deck: Deck, now: datetime) -> DeckOut:
    return DeckOut(
        id=deck.id,
        name=deck.name,
        topic=deck.topic,
        count=len(deck.cards),
        due_count=_due_count(deck, now),
        created_at=deck.created_at,
        updated_at=deck.updated_at,
    )


async def _get_or_404(session, deck_id: uuid.UUID) -> Deck:
    deck = await session.get(Deck, deck_id)
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


async def list_decks(session) -> list[DeckOut]:
    now = datetime.now(timezone.utc)
    decks = (await session.execute(select(Deck))).scalars().all()
    return [_to_out(d, now) for d in decks]


async def create_deck(session, data: DeckCreate) -> DeckOut:
    deck = Deck(name=data.name, topic=data.topic)
    session.add(deck)
    await session.commit()
    await session.refresh(deck, attribute_names=["cards"])
    return _to_out(deck, datetime.now(timezone.utc))


async def get_deck_detail(session, deck_id: uuid.UUID) -> DeckDetailOut:
    deck = await _get_or_404(session, deck_id)
    now = datetime.now(timezone.utc)
    base = _to_out(deck, now)
    return DeckDetailOut(**base.model_dump(), cards=[CardOut.model_validate(c) for c in deck.cards])


async def update_deck(session, deck_id: uuid.UUID, data: DeckUpdate) -> DeckOut:
    deck = await _get_or_404(session, deck_id)
    if data.name is not None:
        deck.name = data.name
    if data.topic is not None:
        deck.topic = data.topic
    await session.commit()
    await session.refresh(deck)
    return _to_out(deck, datetime.now(timezone.utc))


async def delete_deck(session, deck_id: uuid.UUID) -> None:
    deck = await _get_or_404(session, deck_id)
    await session.delete(deck)
    await session.commit()
