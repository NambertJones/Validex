"""Pydantic schemas for deficiency notices."""

from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict
from app.models.notification import NotificationStatus


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    application_id: UUID
    subject: str
    body: str
    items: list[dict[str, Any]]
    channels: list[str]
    status: NotificationStatus
    due_date: datetime | None
    created_at: datetime
    acknowledged_at: datetime | None
