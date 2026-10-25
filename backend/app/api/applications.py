"""Application management endpoints (CRUD, status updates, listings)."""

import random
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.application import Application, ApplicationStatus, ApplicationCategory
from app.models.document import Document, DocumentStatus
from app.schemas.application import (
    ApplicationCreate,
    ApplicationStatusUpdate,
    ApplicationResponse,
    ApplicationDetailResponse,
)
from app.schemas.document import DocumentResponse
from app.schemas.validation import ValidationResultResponse
from app.services.audit_service import audit_service

router = APIRouter(prefix="/applications", tags=["Applications"])


def generate_app_number() -> str:
    return f"AICTE-2025-{random.randint(10000, 99999)}"


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    app_in: ApplicationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Create a new AICTE approval application."""
    inst_name = app_in.institution_name or current_user.institution_name or "Apex Institute of Technology"
    app = Application(
        application_number=generate_app_number(),
        institution_id=current_user.id,
        institution_name=inst_name,
        category=app_in.category,
        academic_year=app_in.academic_year,
        status=ApplicationStatus.SUBMITTED,
        risk_score=0.0,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    audit_service.log_event(
        db=db,
        action="APPLICATION_CREATED",
        user_id=current_user.id,
        application_id=app.id,
        details={"application_number": app.application_number, "category": app.category.value},
    )
    return app


@router.get("", response_model=list[ApplicationResponse])
def list_applications(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: ApplicationStatus | None = Query(None),
    category: ApplicationCategory | None = Query(None),
    search: str | None = Query(None),
    skip: int = 0,
    limit: int = 50,
):
    """List applications with optional status and category filters."""
    query = db.query(Application)

    # Institutions only see their own applications
    if current_user.role == UserRole.INSTITUTION:
        query = query.filter(Application.institution_id == current_user.id)

    if status:
        query = query.filter(Application.status == status)
    if category:
        query = query.filter(Application.category == category)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Application.institution_name.ilike(search_filter))
            | (Application.application_number.ilike(search_filter))
        )

    return query.order_by(desc(Application.submitted_at)).offset(skip).limit(limit).all()


@router.get("/{app_id}", response_model=ApplicationDetailResponse)
def get_application(
    app_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get complete details of an application including documents and findings."""
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == UserRole.INSTITUTION and app.institution_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this application")

    total_docs = len(app.documents)
    pending_docs = sum(1 for d in app.documents if d.status == DocumentStatus.PENDING)
    flagged_docs = sum(1 for d in app.documents if d.status == DocumentStatus.FLAGGED)

    doc_responses = [DocumentResponse.model_validate(d) for d in app.documents]
    val_responses = [ValidationResultResponse.model_validate(v) for v in app.validation_results]

    return ApplicationDetailResponse(
        id=app.id,
        application_number=app.application_number,
        institution_id=app.institution_id,
        institution_name=app.institution_name,
        category=app.category,
        academic_year=app.academic_year,
        status=app.status,
        risk_score=app.risk_score,
        overall_verdict=app.overall_verdict,
        submitted_at=app.submitted_at,
        updated_at=app.updated_at,
        documents=doc_responses,
        validation_results=val_responses,
        total_documents=total_docs,
        pending_documents=pending_docs,
        flagged_documents=flagged_docs,
    )


@router.patch("/{app_id}/status", response_model=ApplicationResponse)
def update_application_status(
    app_id: uuid.UUID,
    status_update: ApplicationStatusUpdate,
    current_user: Annotated[
        User,
        Depends(require_role([UserRole.ADMIN, UserRole.SCRUTINY, UserRole.EXPERT])),
    ],
    db: Annotated[Session, Depends(get_db)],
):
    """Official action: Update the verification / approval status of an application."""
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    old_status = app.status
    app.status = status_update.status
    if status_update.verdict_notes:
        app.overall_verdict = status_update.verdict_notes
    db.commit()
    db.refresh(app)

    audit_service.log_event(
        db=db,
        action="APPLICATION_STATUS_UPDATED",
        user_id=current_user.id,
        application_id=app.id,
        details={
            "old_status": old_status.value,
            "new_status": app.status.value,
            "notes": status_update.verdict_notes,
        },
    )
    return app
