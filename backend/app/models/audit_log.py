"""SQLAlchemy AuditLog model for tracking all official decisions and system detections."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=True)
    application_id = Column(Uuid, ForeignKey("applications.id"), nullable=True)
    action = Column(String(128), nullable=False)  # e.g., "DOC_UPLOAD", "FORGERY_FLAGGED", "STATUS_CHANGE"
    details = Column(JSON, default=dict, nullable=False)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="audit_logs")
    application = relationship("Application", back_populates="audit_logs")
