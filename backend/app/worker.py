"""Celery worker entrypoint."""

from app.core.celery_app import celery
from app.tasks import (
    process_document_ocr,
    analyze_document_forgery,
    verify_document_task,
    process_lab_photo_cv,
    send_deficiency_alert,
)

celery_app = celery

__all__ = ["celery_app"]
