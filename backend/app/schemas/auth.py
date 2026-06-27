import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.]+$")
    password: str = Field(min_length=6, max_length=128)
    display_name: str = ""

    @field_validator("username")
    @classmethod
    def _normalize_username(cls, v: str) -> str:
        return v.lower()


class LoginRequest(BaseModel):
    identifier: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    username: str
    display_name: str
