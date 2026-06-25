import uuid

from fastapi import HTTPException
from sqlalchemy import select

from app.db.models import Card, Deck
from app.schemas.card import CardCreate, CardUpdate


async def _user_deck_or_404(session, deck_id: uuid.UUID, user_id: uuid.UUID) -> Deck:
    deck = await session.get(Deck, deck_id)
    if deck is None or deck.user_id != user_id:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


async def get_card_or_404(session, card_id: uuid.UUID, user_id: uuid.UUID) -> Card:
    card = await session.get(Card, card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")
    await _user_deck_or_404(session, card.deck_id, user_id)
    return card


async def list_cards(session, deck_id: uuid.UUID, user_id: uuid.UUID) -> list[Card]:
    await _user_deck_or_404(session, deck_id, user_id)
    rows = await session.execute(select(Card).where(Card.deck_id == deck_id))
    return list(rows.scalars().all())


async def add_card(session, deck_id: uuid.UUID, data: CardCreate, user_id: uuid.UUID) -> Card:
    await _user_deck_or_404(session, deck_id, user_id)
    card = Card(deck_id=deck_id, **data.model_dump())
    session.add(card)
    await session.commit()
    await session.refresh(card)
    return card


async def update_card(session, card_id: uuid.UUID, data: CardUpdate, user_id: uuid.UUID) -> Card:
    card = await get_card_or_404(session, card_id, user_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(card, field, value)
    await session.commit()
    await session.refresh(card)
    return card


async def delete_card(session, card_id: uuid.UUID, user_id: uuid.UUID) -> None:
    card = await get_card_or_404(session, card_id, user_id)
    await session.delete(card)
    await session.commit()
