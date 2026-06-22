from enum import Enum


class Rating(str, Enum):
    forgot = "forgot"
    vague = "vague"
    remember = "remember"


class ReviewMode(str, Enum):
    flash = "flash"
    quiz = "quiz"
    fill = "fill"
