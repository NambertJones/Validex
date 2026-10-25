"""Source authority verification service (DigiLocker, State Fire Authority, ICAI UDIN, MCA)."""

import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentType
from app.models.verification import Verification, VerificationMethod, VerificationStatus
from app.services.audit_service import audit_service


class VerificationService:
    """Handles external source verification via mock authority API connectors and QR code parsing."""

    def verify_document(
        self,
        db: Session,
        document_id: uuid.UUID,
        source_authority: str = "DigiLocker",
        user_id: uuid.UUID | None = None,
    ) -> Verification:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise ValueError("Document not found")

        ext = doc.extracted_data or {}
        method = VerificationMethod.API
        status = VerificationStatus.VERIFIED
        response_payload: dict[str, Any] = {}

        # 1. Fire Safety Certificate Verification
        if doc.doc_type == DocumentType.FIRE_SAFETY:
            cert_no = ext.get("certificate_number") or "FS-2024-DEF"
            source_authority = "State Fire & Emergency Services Dept"
            if "tampered" in doc.original_filename.lower() or ext.get("forgery_score", 0) > 30:
                status = VerificationStatus.MISMATCH
                response_payload = {
                    "verified": False,
                    "error": "Record mismatch: Issued certificate validity does not match uploaded copy dates",
                    "authority_record_valid_until": "15/03/2023",
                    "uploaded_valid_until": ext.get("valid_until", "Unknown"),
                }
            else:
                status = VerificationStatus.VERIFIED
                response_payload = {
                    "verified": True,
                    "certificate_number": cert_no,
                    "issuing_station": "Headquarters Fire Station",
                    "status": "Active & Valid",
                    "valid_until": ext.get("valid_until", "31/12/2026"),
                }

        # 2. Audit Report UDIN Verification via ICAI Portal Simulator
        elif doc.doc_type == DocumentType.AUDIT_REPORT:
            udin = ext.get("udin")
            source_authority = "ICAI UDIN Verification Portal"
            if udin and len(udin) == 18:
                status = VerificationStatus.VERIFIED
                response_payload = {
                    "udin": udin,
                    "ca_name": "R. Sharma & Associates",
                    "membership_no": ext.get("ca_membership_no", "054321"),
                    "status": "Active & Validated",
                    "financial_year": ext.get("financial_year", "2024-2025"),
                }
            else:
                status = VerificationStatus.MISMATCH
                response_payload = {
                    "verified": False,
                    "error": "UDIN not found in ICAI repository or invalid format",
                }

        # 3. Land Document via DigiLocker / Revenue Department
        elif doc.doc_type == DocumentType.LAND_DOCUMENT:
            source_authority = "DigiLocker Land Records"
            deed_no = ext.get("deed_number") or "DEED-REG-9812"
            status = VerificationStatus.VERIFIED
            response_payload = {
                "verified": True,
                "deed_number": deed_no,
                "registry_office": "Sub-Registrar District Office",
                "encumbrance_status": "Non-Encumbered / Clear Title",
                "registered_entity": "Educational Charitable Trust",
            }

        # 4. Fallback DigiLocker verification
        else:
            source_authority = "DigiLocker Central Repository"
            status = VerificationStatus.VERIFIED
            response_payload = {
                "verified": True,
                "doc_type": doc.doc_type.value,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "issuer": "Authorized Government Repository",
            }

        # Save verification record
        verification = Verification(
            document_id=doc.id,
            method=method,
            source_authority=source_authority,
            status=status,
            source_response=response_payload,
        )
        db.add(verification)
        db.commit()
        db.refresh(verification)

        # Audit log
        audit_service.log_event(
            db=db,
            action="DOCUMENT_VERIFIED",
            user_id=user_id,
            application_id=doc.application_id,
            details={
                "document_id": str(doc.id),
                "authority": source_authority,
                "status": status.value,
            },
        )

        return verification


verification_service = VerificationService()
