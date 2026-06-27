from fastapi import APIRouter

from app.api.routers import auth, cards, decks, health, profile, progress, review

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(health.router)
api_router.include_router(decks.router)
api_router.include_router(cards.deck_cards_router)
# /cards/recent must be registered before /cards/{card_id} to avoid 'recent' parsing as a UUID
api_router.include_router(progress.cards_extra_router)
api_router.include_router(cards.cards_router)
api_router.include_router(review.router)
api_router.include_router(progress.progress_router)
api_router.include_router(progress.dashboard_router)
api_router.include_router(profile.router)
