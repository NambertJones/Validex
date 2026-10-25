"""Document upload, inspection, and OCR data retrieval endpoints."""

import io
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.storage import storage
from app.models.user import User
from app.models.application import Application
from app.models.document import Document, DocumentType, DocumentStatus
from app.schemas.document import DocumentResponse, DocumentDetailResponse
from app.services.document_service import document_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    application_id: Annotated[uuid.UUID, Form()],
    file: Annotated[UploadFile, File()],
    doc_type: Annotated[DocumentType | None, Form()] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Session = Depends(get_db),
):
    """Upload a document PDF or image to an AICTE application:
    Runs OCR extraction, document classification, and forgery forensics automatically.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Target application not found")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    doc = document_service.process_and_save_document(
        db=db,
        application_id=application_id,
        file_bytes=file_bytes,
        filename=file.filename or "uploaded_document.pdf",
        user_id=current_user.id if current_user else None,
        manual_doc_type=doc_type,
    )

    return doc


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
def get_document(
    doc_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get metadata, validation flags, and presigned access for a document."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    download_url = None
    try:
        download_url = storage.get_presigned_url(doc.storage_path)
    except Exception:
        pass

    return DocumentDetailResponse(
        id=doc.id,
        application_id=doc.application_id,
        doc_type=doc.doc_type,
        original_filename=doc.original_filename,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        status=doc.status,
        extracted_data=doc.extracted_data,
        page_count=doc.page_count,
        uploaded_at=doc.uploaded_at,
        download_url=download_url,
        validation_count=len(doc.validation_results),
        verification_count=len(doc.verifications),
    )


@router.get("/{doc_id}/extracted-data")
def get_extracted_data(
    doc_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve structured OCR-extracted key-value pairs and confidence metrics."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": str(doc.id),
        "doc_type": doc.doc_type.value,
        "extracted_data": doc.extracted_data,
        "forgery_score": (doc.extracted_data or {}).get("forgery_score", 0.0),
        "heatmap_available": bool((doc.extracted_data or {}).get("forgery_heatmap_preview")),
    }


@router.get("/{doc_id}/preview")
def get_document_file(
    doc_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Serve the raw document file bytes for in-browser viewer."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        file_bytes = storage.get_bytes(doc.storage_path)
        return Response(content=file_bytes, media_type=doc.mime_type)
    except Exception:
        # If MinIO is offline, return synthetic document response or 404
        raise HTTPException(status_code=404, detail="File object not available in active storage")
