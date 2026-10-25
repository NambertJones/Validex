"""Pydantic schemas for authentication and user accounts."""

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole = UserRole.INSTITUTION
    institution_name: str | None = None


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    email: str


class TokenPayload(BaseModel):
    sub: str | None = None
    role: str | None = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    institution_name: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
