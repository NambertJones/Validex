"""Audit trail service for logging system detections, human decisions, and governance compliance."""

import uuid
from typing import Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        action: str,
        user_id: uuid.UUID | None = None,
        application_id: uuid.UUID | None = None,
        details: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        """Create an immutable audit log entry."""
        log = AuditLog(
            user_id=user_id,
            application_id=application_id,
            action=action,
            details=details or {},
            ip_address=ip_address,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def get_application_logs(db: Session, application_id: uuid.UUID, limit: int = 100) -> list[AuditLog]:
        return (
            db.query(AuditLog)
            .filter(AuditLog.application_id == application_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_recent_activity(db: Session, limit: int = 20) -> list[AuditLog]:
        return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()


audit_service = AuditService()
