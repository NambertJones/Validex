"""Aggregated API router combining all domain endpoints."""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.applications import router as applications_router
from app.api.documents import router as documents_router
from app.api.validation import router as validation_router
from app.api.verification import router as verification_router
from app.api.compliance import router as compliance_router
from app.api.infrastructure import router as infrastructure_router
from app.api.dashboard import router as dashboard_router
from app.api.audit import router as audit_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(applications_router)
api_router.include_router(documents_router)
api_router.include_router(validation_router)
api_router.include_router(verification_router)
api_router.include_router(compliance_router)
api_router.include_router(infrastructure_router)
api_router.include_router(dashboard_router)
api_router.include_router(audit_router)

__all__ = ["api_router"]
