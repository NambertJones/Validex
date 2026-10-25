"""Celery asynchronous task for OCR and structured data extraction."""

import logging
from app.core.celery_app import celery
from app.core.database import SessionLocal
from app.core.storage import storage
from app.models.document import Document, DocumentStatus
from app.ml.ocr_engine import ocr_engine
from app.ml.document_classifier import classifier
from app.ml.data_extractor import data_extractor

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="app.tasks.ocr_tasks.process_document_ocr", max_retries=3)
def process_document_ocr(self, document_id: str):
    """Background task to run heavy OCR text extraction and field identification."""
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found")
            return {"status": "error", "message": "Document not found"}

        doc.status = DocumentStatus.PROCESSING
        db.commit()

        file_bytes = storage.get_bytes(doc.storage_path)
        is_pdf = doc.original_filename.lower().endswith(".pdf") or file_bytes.startswith(b"%PDF")

        # Run OCR
        ocr_res = ocr_engine.extract_from_pdf_bytes(file_bytes) if is_pdf else ocr_engine._tesseract_or_dummy_fallback(file_bytes)

        # Classify if needed
        doc.doc_type = classifier.classify(ocr_res.text, doc.original_filename)

        # Extract structured data
        extracted = data_extractor.extract_fields(ocr_res.text, doc.doc_type)
        extracted["ocr_confidence"] = ocr_res.confidence
        extracted["raw_text_snippet"] = ocr_res.text[:1000]

        doc.extracted_data = extracted
        doc.status = DocumentStatus.VALIDATED
        db.commit()

        return {
            "status": "success",
            "document_id": document_id,
            "detected_type": doc.doc_type.value,
        }
    except Exception as exc:
        logger.error(f"OCR task failed for document {document_id}: {exc}")
        db.rollback()
        raise self.retry(exc=exc, countdown=15)
    finally:
        db.close()
