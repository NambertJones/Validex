"""Issuing-authority verification endpoints."""

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_document_for_user, require_official
from app.models.user import User
from app.models.verification import Verification
from app.schemas.verification import VerificationResponse
from app.services.verification_service import SOURCES, verification_service
from app.mock_authority.service import authority_name

router = APIRouter(prefix="/verification", tags=["Source Verification"])


@router.post("/trigger/{doc_id}", response_model=list[VerificationResponse], status_code=201)
def trigger_verification(doc_id: uuid.UUID, db: Annotated[Session, Depends(get_db)],
                         current_user: Annotated[User, Depends(require_official)]):
    """Verify a document via its signed QR code (offline) and the issuing authority's records (API)."""
    doc = get_document_for_user(db, doc_id, current_user)
    return verification_service.verify_document(db, doc.id, user_id=current_user.id)


@router.get("/status/{doc_id}", response_model=list[VerificationResponse])
def get_verification_history(doc_id: uuid.UUID, db: Annotated[Session, Depends(get_db)],
                             current_user: Annotated[User, Depends(require_official)]):
    doc = get_document_for_user(db, doc_id, current_user)
    return db.query(Verification).filter(Verification.document_id == doc.id).order_by(Verification.verified_at.desc()).all()


@router.get("/sources")
def list_sources(current_user: Annotated[User, Depends(get_current_user)]):
    """Which document types can be verified automatically, and against which source."""
    return [{"doc_type": dt.value, "source": authority_name(spec["authority"]), "identifier": spec["id_field"],
             "fields_compared": [c[0] for c in spec["compare"]]} for dt, spec in SOURCES.items()]
