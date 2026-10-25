"""SQLAlchemy Verification model for third-party authority checks (DigiLocker, Fire dept, etc.)."""

import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, JSON, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class VerificationMethod(str, enum.Enum):
    API = "api"
    QR_CODE = "qr_code"
    DIGITAL_SIGNATURE = "digital_signature"
    PORTAL = "portal"
    MANUAL = "manual"


class VerificationStatus(str, enum.Enum):
    VERIFIED = "verified"
    MISMATCH = "mismatch"
    EXPIRED = "expired"
    PENDING = "pending"
    UNAVAILABLE = "unavailable"
    MANUAL_REVIEW = "manual_review"


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    document_id = Column(Uuid, ForeignKey("documents.id"), nullable=False)
    method = Column(Enum(VerificationMethod), default=VerificationMethod.API, nullable=False)
    source_authority = Column(String(255), nullable=False)  # e.g., "DigiLocker", "State Fire Dept", "MCA"
    status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING, nullable=False)
    source_response = Column(JSON, default=dict, nullable=False)
    verified_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    document = relationship("Document", back_populates="verifications")
