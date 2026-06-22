import uuid

from pydantic import BaseModel


class MasteryCounts(BaseModel):
    new: int
    learning: int
    proficient: int


class WeeklyBar(BaseModel):
    label: str
    count: int


class ProgressSummaryOut(BaseModel):
    streak: int
    reviews_today: int
    mastery: MasteryCounts
    weekly_bars: list[WeeklyBar]
    due_total: int


class HeatmapOut(BaseModel):
    cells: list[int]


class NeedsReviewItem(BaseModel):
    card_id: uuid.UUID
    word: str
    lapses: int


class WordOfDayOut(BaseModel):
    card_id: uuid.UUID
    word: str
    phonetic: str
    pos: str
    meaning: str
    example: str
