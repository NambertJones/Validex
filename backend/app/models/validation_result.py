"""SQLAlchemy ValidationResult model for OCR, Forgery, and Compliance checks."""

import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, JSON, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class CheckType(str, enum.Enum):
    COMPLETENESS = "completeness"
    EXPIRY = "expiry"
    CONSISTENCY = "consistency"
    FORGERY = "forgery"
    COMPLIANCE = "compliance"
    INFRASTRUCTURE = "infrastructure"


class Severity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    application_id = Column(Uuid, ForeignKey("applications.id"), nullable=False)
    document_id = Column(Uuid, ForeignKey("documents.id"), nullable=True)
    check_type = Column(Enum(CheckType), nullable=False)
    severity = Column(Enum(Severity), default=Severity.INFO, nullable=False)
    finding = Column(String(500), nullable=False)
    evidence = Column(String(1000), nullable=True)
    details = Column(JSON, default=dict, nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    application = relationship("Application", back_populates="validation_results")
    document = relationship("Document", back_populates="validation_results")
