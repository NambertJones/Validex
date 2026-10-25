"""Third-party verification endpoints (DigiLocker, State Fire Authority, ICAI UDIN)."""

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.verification import Verification
from app.schemas.verification import VerificationResponse, VerificationTriggerRequest
from app.services.verification_service import verification_service

router = APIRouter(prefix="/verification", tags=["Source Verification"])


@router.post("/trigger/{doc_id}", response_model=VerificationResponse, status_code=status.HTTP_201_CREATED)
def trigger_verification(
    doc_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    authority: str = "DigiLocker",
):
    """Trigger external source verification check against state authority database or DigiLocker."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    res = verification_service.verify_document(
        db=db,
        document_id=doc_id,
        source_authority=authority,
        user_id=current_user.id,
    )
    return res


@router.get("/status/{doc_id}", response_model=list[VerificationResponse])
def get_verification_history(
    doc_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get all past verification requests and authority responses for a document."""
    records = db.query(Verification).filter(Verification.document_id == doc_id).all()
    return records
