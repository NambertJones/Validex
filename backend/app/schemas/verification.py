"""Pydantic schemas for third-party authority verification checks."""

from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel
from app.models.verification import VerificationMethod, VerificationStatus


class VerificationResponse(BaseModel):
    id: UUID
    document_id: UUID
    method: VerificationMethod
    source_authority: str
    status: VerificationStatus
    source_response: dict[str, Any]
    verified_at: datetime

    class Config:
        from_attributes = True


class VerificationTriggerRequest(BaseModel):
    document_id: UUID
    source_authority: str = "DigiLocker"
