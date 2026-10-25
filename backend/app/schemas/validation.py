"""Pydantic schemas for validation findings, fraud flags, and compliance checks."""

from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel
from app.models.validation_result import CheckType, Severity


class ValidationResultResponse(BaseModel):
    id: UUID
    application_id: UUID
    document_id: UUID | None
    check_type: CheckType
    severity: Severity
    finding: str
    evidence: str | None
    details: dict[str, Any]
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True


class ValidationSummary(BaseModel):
    total_checks: int
    critical_flags: int
    warning_flags: int
    info_flags: int
    clean_checks: int
    risk_score: float
    status_recommendation: str


class ValidationReportResponse(BaseModel):
    application_id: UUID
    application_number: str
    institution_name: str
    risk_score: float
    summary: ValidationSummary
    findings: list[ValidationResultResponse]
    generated_at: datetime
