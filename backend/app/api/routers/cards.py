import uuid

from fastapi import APIRouter, status

from app.api.deps import SessionDep
from app.schemas.card import CardCreate, CardOut, CardUpdate
from app.services import cards as svc

# Two prefixes share one module: deck-scoped collection + flat item routes.
deck_cards_router = APIRouter(prefix="/decks", tags=["cards"])
cards_router = APIRouter(prefix="/cards", tags=["cards"])


@deck_cards_router.get("/{deck_id}/cards", response_model=list[CardOut])
async def list_cards(deck_id: uuid.UUID, session: SessionDep):
    return await svc.list_cards(session, deck_id)


@deck_cards_router.post(
    "/{deck_id}/cards", response_model=CardOut, status_code=status.HTTP_201_CREATED
)
async def add_card(deck_id: uuid.UUID, data: CardCreate, session: SessionDep):
    return await svc.add_card(session, deck_id, data)


@cards_router.get("/{card_id}", response_model=CardOut)
async def get_card(card_id: uuid.UUID, session: SessionDep):
    return await svc.get_card_or_404(session, card_id)


@cards_router.patch("/{card_id}", response_model=CardOut)
async def update_card(card_id: uuid.UUID, data: CardUpdate, session: SessionDep):
    return await svc.update_card(session, card_id, data)


@cards_router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(card_id: uuid.UUID, session: SessionDep):
    await svc.delete_card(session, card_id)
