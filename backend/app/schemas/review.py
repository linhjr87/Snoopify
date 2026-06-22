import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.enums import Rating, ReviewMode


class QuizOption(BaseModel):
    key: str
    text: str


class QuizOut(BaseModel):
    options: list[QuizOption] = Field(min_length=4)
    correct_key: str


class FillOut(BaseModel):
    before: str
    after: str
    answer: str
    hint: str


class ReviewItemOut(BaseModel):
    card_id: uuid.UUID
    word: str
    phonetic: str
    pos: str
    meaning: str
    example: str
    quiz: QuizOut
    fill: FillOut


class GradeRequest(BaseModel):
    card_id: uuid.UUID
    rating: Rating
    mode: ReviewMode
    is_correct: bool | None = None


class GradeResult(BaseModel):
    card_id: uuid.UUID
    ease_factor: float
    interval_days: int
    repetitions: int
    lapses: int
    due_at: datetime
    last_reviewed_at: datetime
