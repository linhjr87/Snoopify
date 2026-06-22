from fastapi import APIRouter

from app.api.routers import cards, decks, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(decks.router)
api_router.include_router(cards.deck_cards_router)
api_router.include_router(cards.cards_router)
