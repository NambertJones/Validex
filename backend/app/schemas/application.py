"""Pydantic schemas for AICTE applications."""

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.models.application import ApplicationCategory, ApplicationStatus
from app.schemas.document import DocumentResponse
from app.schemas.validation import ValidationResultResponse


class ApplicationCreate(BaseModel):
    category: ApplicationCategory = ApplicationCategory.EOA
    academic_year: str = "2025-2026"
    institution_name: str | None = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    verdict_notes: str | None = None


class ApplicationResponse(BaseModel):
    id: UUID
    application_number: str
    institution_id: UUID
    institution_name: str
    category: ApplicationCategory
    academic_year: str
    status: ApplicationStatus
    risk_score: float
    overall_verdict: str | None
    submitted_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationDetailResponse(ApplicationResponse):
    documents: list[DocumentResponse] = []
    validation_results: list[ValidationResultResponse] = []
    total_documents: int = 0
    pending_documents: int = 0
    flagged_documents: int = 0
