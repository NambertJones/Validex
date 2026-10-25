"""Celery background tasks package."""

from app.tasks.ocr_tasks import process_document_ocr
from app.tasks.forgery_tasks import analyze_document_forgery
from app.tasks.verification_tasks import verify_document_task
from app.tasks.infrastructure_tasks import process_lab_photo_cv
from app.tasks.notification_tasks import send_deficiency_alert

__all__ = [
    "process_document_ocr",
    "analyze_document_forgery",
    "verify_document_task",
    "process_lab_photo_cv",
    "send_deficiency_alert",
]
