from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums import CEFR_LEVELS


class ProfileUpdate(BaseModel):
    display_name: str = Field(max_length=120)
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.]+$")
    level: str
    level_target: str
    goal_text: str = Field(max_length=200)
    daily_target: int = Field(ge=1, le=500)

    @field_validator("username")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()

    @field_validator("level", "level_target")
    @classmethod
    def _cefr(cls, v: str) -> str:
        if v not in CEFR_LEVELS:
            raise ValueError("invalid CEFR level")
        return v


class ProfileStats(BaseModel):
    learned: int
    mastered: int
    streak: int
    accuracy: int


class Achievement(BaseModel):
    key: str
    earned: bool


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    display_name: str
    username: str
    email: str
    created_at: datetime
    level: str
    level_target: str
    goal_text: str
    daily_target: int
    stats: ProfileStats
    achievements: list[Achievement]
