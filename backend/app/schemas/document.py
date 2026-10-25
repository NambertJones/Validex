"""Pydantic schemas for document upload, metadata, and extracted data."""

from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel
from app.models.document import DocumentType, DocumentStatus


class DocumentResponse(BaseModel):
    id: UUID
    application_id: UUID
    doc_type: DocumentType
    original_filename: str
    file_size: int
    mime_type: str
    status: DocumentStatus
    extracted_data: dict[str, Any]
    page_count: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DocumentDetailResponse(DocumentResponse):
    download_url: str | None = None
    validation_count: int = 0
    verification_count: int = 0
