"""SQLAlchemy Document model for storing uploaded evidence."""

import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, JSON, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class DocumentType(str, enum.Enum):
    FIRE_SAFETY = "fire_safety"
    AUDIT_REPORT = "audit_report"
    LAND_DOCUMENT = "land_document"
    FACULTY_LIST = "faculty_list"
    NOC = "noc"
    AFFIDAVIT = "affidavit"
    BUILDING_PLAN = "building_plan"
    LAB_PHOTO = "lab_photo"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    VALIDATED = "validated"
    FLAGGED = "flagged"
    REJECTED = "rejected"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    application_id = Column(Uuid, ForeignKey("applications.id"), nullable=False)
    doc_type = Column(Enum(DocumentType), default=DocumentType.OTHER, nullable=False)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False)
    file_size = Column(Integer, default=0, nullable=False)
    mime_type = Column(String(128), default="application/pdf", nullable=False)
    content_hash = Column(String(64), nullable=True, index=True)  # SHA-256
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING, nullable=False)
    extracted_data = Column(JSON, default=dict, nullable=False)
    page_count = Column(Integer, default=1, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    application = relationship("Application", back_populates="documents")
    validation_results = relationship("ValidationResult", back_populates="document", cascade="all, delete-orphan")
    verifications = relationship("Verification", back_populates="document", cascade="all, delete-orphan")
