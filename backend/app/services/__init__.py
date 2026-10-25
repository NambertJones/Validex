"""Business logic services for AICTE validation platform."""

from app.services.audit_service import audit_service
from app.services.document_service import document_service
from app.services.validation_service import validation_service
from app.services.verification_service import verification_service
from app.services.compliance_service import compliance_service
from app.services.dashboard_service import dashboard_service

__all__ = [
    "audit_service",
    "document_service",
    "validation_service",
    "verification_service",
    "compliance_service",
    "dashboard_service",
]
