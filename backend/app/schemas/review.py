import uuid

from pydantic import BaseModel


class QuizOption(BaseModel):
    key: str
    text: str


class QuizOut(BaseModel):
    options: list[QuizOption]
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
