import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.card import CardOut


class DeckCreate(BaseModel):
    name: str
    topic: str = ""


class DeckUpdate(BaseModel):
    name: str | None = None
    topic: str | None = None


class DeckOut(BaseModel):
    id: uuid.UUID
    name: str
    topic: str
    count: int
    due_count: int
    mastery_pct: float
    last_reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class DeckDetailOut(DeckOut):
    cards: list[CardOut]
