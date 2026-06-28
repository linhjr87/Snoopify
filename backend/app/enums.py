from enum import Enum


class Rating(str, Enum):
    forgot = "forgot"
    vague = "vague"
    remember = "remember"


class ReviewMode(str, Enum):
    flash = "flash"
    quiz = "quiz"
    fill = "fill"


CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
