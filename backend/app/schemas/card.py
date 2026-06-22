import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    deck_id: uuid.UUID
    word: str
    phonetic: str
    pos: str
    meaning: str
    example: str
    ease_factor: float
    interval_days: int
    repetitions: int
    lapses: int
    due_at: datetime
    last_reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime
