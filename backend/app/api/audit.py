"""Audit trail inspection and governance history endpoints."""

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.application import Application
from app.services.audit_service import audit_service

router = APIRouter(prefix="/audit", tags=["Audit Trail & Governance"])


@router.get("/{app_id}")
def get_application_audit_trail(
    app_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve complete, immutable chronological audit trail for an application."""
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    logs = audit_service.get_application_logs(db=db, application_id=app_id)
    return [
        {
            "id": str(log.id),
            "action": log.action,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at,
            "user_id": str(log.user_id) if log.user_id else None,
        }
        for log in logs
    ]


@router.get("/system/recent")
def get_system_audit_trail(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 50,
):
    """Get system-wide chronological activity events."""
    logs = audit_service.get_recent_activity(db=db, limit=limit)
    return [
        {
            "id": str(log.id),
            "action": log.action,
            "details": log.details,
            "application_id": str(log.application_id) if log.application_id else None,
            "created_at": log.created_at,
        }
        for log in logs
    ]
