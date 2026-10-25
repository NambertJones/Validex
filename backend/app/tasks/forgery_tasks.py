"""Celery asynchronous task for deep document forgery and tamper forensics."""

import logging
from app.core.celery_app import celery
from app.core.database import SessionLocal
from app.core.storage import storage
from app.models.document import Document, DocumentStatus
from app.models.validation_result import ValidationResult, CheckType, Severity
from app.ml.forgery_detector import forgery_detector

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="app.tasks.forgery_tasks.analyze_document_forgery", max_retries=2)
def analyze_document_forgery(self, document_id: str):
    """Background task to run ELA, Copy-Move, and PDF forensics."""
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return {"status": "error", "message": "Document not found"}

        file_bytes = storage.get_bytes(doc.storage_path)
        report = forgery_detector.analyze_document(file_bytes, doc.original_filename)

        ext = dict(doc.extracted_data or {})
        ext["forgery_score"] = report.forgery_score
        if report.heatmap_base64:
            ext["forgery_heatmap_preview"] = report.heatmap_base64
        ext["tampered_regions"] = report.tampered_regions
        doc.extracted_data = ext

        if report.is_tampered:
            doc.status = DocumentStatus.FLAGGED
            val_res = ValidationResult(
                application_id=doc.application_id,
                document_id=doc.id,
                check_type=CheckType.FORGERY,
                severity=Severity.CRITICAL,
                finding=f"Document digital tampering flagged on {doc.original_filename} (Risk: {report.forgery_score}%)",
                evidence="; ".join([c["description"] for c in report.checks if c["status"] == "flagged"]),
                details=report.to_dict(),
                confidence=0.93,
            )
            db.add(val_res)

        db.commit()
        return {"status": "success", "is_tampered": report.is_tampered, "score": report.forgery_score}
    except Exception as exc:
        logger.error(f"Forgery task failed for doc {document_id}: {exc}")
        db.rollback()
        raise self.retry(exc=exc, countdown=20)
    finally:
        db.close()
