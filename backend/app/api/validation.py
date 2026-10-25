"""Validation triggering, findings inspection, and audit report generation endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.application import Application
from app.models.validation_result import ValidationResult, Severity
from app.schemas.validation import (
    ValidationReportResponse,
    ValidationResultResponse,
    ValidationSummary,
)
from app.services.validation_service import validation_service

router = APIRouter(prefix="/validation", tags=["Validation & Fraud Detection"])


@router.post("/trigger/{app_id}")
def trigger_validation(
    app_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Trigger the complete validation pipeline on an AICTE application:
    Runs completeness, expiry, consistency, and risk scoring.
    """
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    result = validation_service.validate_application(db=db, application_id=app_id)
    return {"message": "Validation complete", "data": result}


@router.get("/report/{app_id}", response_model=ValidationReportResponse)
def get_validation_report(
    app_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve the official structured AI decision-support report with evidence links."""
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    findings = (
        db.query(ValidationResult)
        .filter(ValidationResult.application_id == app_id)
        .order_by(ValidationResult.severity.desc(), ValidationResult.created_at.desc())
        .all()
    )

    crit_count = sum(1 for f in findings if f.severity == Severity.CRITICAL)
    warn_count = sum(1 for f in findings if f.severity == Severity.WARNING)
    info_count = sum(1 for f in findings if f.severity == Severity.INFO)
    clean_count = max(len(app.documents) * 3 - len(findings), 0)

    rec = "Approved for next stage"
    if crit_count > 0:
        rec = "Reject / Issue Deficiency Notice"
    elif warn_count > 0:
        rec = "Scrutiny Review with Clarifications Requested"

    summary = ValidationSummary(
        total_checks=len(findings) + clean_count,
        critical_flags=crit_count,
        warning_flags=warn_count,
        info_flags=info_count,
        clean_checks=clean_count,
        risk_score=app.risk_score,
        status_recommendation=rec,
    )

    finding_responses = [ValidationResultResponse.model_validate(f) for f in findings]

    return ValidationReportResponse(
        application_id=app.id,
        application_number=app.application_number,
        institution_name=app.institution_name,
        risk_score=app.risk_score,
        summary=summary,
        findings=finding_responses,
        generated_at=datetime.now(timezone.utc),
    )


@router.get("/results/{app_id}", response_model=list[ValidationResultResponse])
def get_validation_results(
    app_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all raw validation findings for an application."""
    findings = db.query(ValidationResult).filter(ValidationResult.application_id == app_id).all()
    return findings
