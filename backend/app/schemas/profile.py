from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
