"""SQLAlchemy Application model."""

import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class ApplicationCategory(str, enum.Enum):
    EOA = "eoa"  # Extension of Approval
    NEW_INSTITUTION = "new_institution"
    CHANGE_INTAKE = "change_intake"
    CLOSURE = "closure"
    OTHER = "other"


class ApplicationStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    DEFICIENCY_FOUND = "deficiency_found"
    VERIFIED = "verified"
    APPROVED = "approved"
    REJECTED = "rejected"


class Application(Base):
    __tablename__ = "applications"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    application_number = Column(String(64), unique=True, index=True, nullable=False)
    institution_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    institution_name = Column(String(255), nullable=False)
    category = Column(Enum(ApplicationCategory), default=ApplicationCategory.EOA, nullable=False)
    academic_year = Column(String(32), default="2025-2026", nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.SUBMITTED, nullable=False)
    risk_score = Column(Float, default=0.0, nullable=False)  # 0 to 100
    overall_verdict = Column(String(500), nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    institution = relationship("User", back_populates="applications")
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="application", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="application", cascade="all, delete-orphan")
