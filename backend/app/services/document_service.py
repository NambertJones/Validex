"""Document management and processing service."""

import hashlib
import uuid
from typing import Any
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.storage import storage
from app.models.document import Document, DocumentType, DocumentStatus
from app.models.validation_result import ValidationResult, CheckType, Severity
from app.ml.ocr_engine import ocr_engine
from app.ml.document_classifier import classifier
from app.ml.data_extractor import data_extractor
from app.ml.forgery_detector import forgery_detector
from app.services.audit_service import audit_service


class DocumentService:
    @staticmethod
    def process_and_save_document(
        db: Session,
        application_id: uuid.UUID,
        file_bytes: bytes,
        filename: str,
        user_id: uuid.UUID | None = None,
        manual_doc_type: DocumentType | None = None,
    ) -> Document:
        """Process an uploaded document:
        1. SHA-256 content hash
        2. Upload to MinIO/Storage
        3. OCR Extraction
        4. Auto-classification (if not manually specified)
        5. Structured data extraction
        6. Forgery analysis
        7. Audit trail record
        """
        # 1. Content hash
        content_hash = hashlib.sha256(file_bytes).hexdigest()

        # 2. Upload to storage
        storage_path = f"applications/{application_id}/{uuid.uuid4()}_{filename}"
        try:
            storage.upload_bytes(file_bytes, storage_path)
        except Exception:
            # Fallback path representation
            pass

        # 3. OCR extraction
        ocr_res = ocr_engine.extract_from_pdf_bytes(file_bytes) if (filename.lower().endswith(".pdf") or file_bytes.startswith(b"%PDF")) else ocr_engine._tesseract_or_dummy_fallback(file_bytes)

        # 4. Classification
        if manual_doc_type and manual_doc_type != DocumentType.OTHER:
            detected_type = manual_doc_type
        else:
            detected_type = classifier.classify(ocr_res.text, filename)

        # 5. Extract structured fields
        extracted = data_extractor.extract_fields(ocr_res.text, detected_type)
        extracted["ocr_confidence"] = float(ocr_res.confidence)
        extracted["raw_text_snippet"] = str(ocr_res.text[:1000])

        # 6. Forgery analysis
        forgery_rep = forgery_detector.analyze_document(file_bytes, filename)
        if forgery_rep.heatmap_base64:
            extracted["forgery_heatmap_preview"] = forgery_rep.heatmap_base64
        extracted["forgery_score"] = float(forgery_rep.forgery_score)
        extracted["tampered_regions"] = forgery_rep.tampered_regions

        doc_status = DocumentStatus.FLAGGED if forgery_rep.is_tampered else DocumentStatus.VALIDATED

        # Create Document record
        doc = Document(
            application_id=application_id,
            doc_type=detected_type,
            original_filename=filename,
            storage_path=storage_path,
            file_size=len(file_bytes),
            mime_type="application/pdf" if filename.lower().endswith(".pdf") else "image/jpeg",
            content_hash=content_hash,
            status=doc_status,
            extracted_data=extracted,
            page_count=max(ocr_res.text.count("--- Page Break ---") + 1, 1),
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # Record validation result if forgery is flagged
        if forgery_rep.is_tampered:
            val_res = ValidationResult(
                application_id=application_id,
                document_id=doc.id,
                check_type=CheckType.FORGERY,
                severity=Severity.CRITICAL,
                finding=f"Potential forgery detected in {filename} (Risk Score: {forgery_rep.forgery_score}/100)",
                evidence="; ".join([c["description"] for c in forgery_rep.checks if c["status"] == "flagged"]),
                details=forgery_rep.to_dict(),
                confidence=0.92,
            )
            db.add(val_res)
            db.commit()

        # Audit log
        audit_service.log_event(
            db=db,
            action="DOCUMENT_UPLOADED",
            user_id=user_id,
            application_id=application_id,
            details={
                "document_id": str(doc.id),
                "filename": filename,
                "detected_type": detected_type.value,
                "forgery_score": forgery_rep.forgery_score,
                "status": doc_status.value,
            },
        )

        return doc


document_service = DocumentService()
