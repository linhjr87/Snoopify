from fastapi import APIRouter

from app.api.routers import decks, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(decks.router)
