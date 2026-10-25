"""Celery task for background infrastructure computer vision processing."""

import logging
from app.core.celery_app import celery
from app.core.database import SessionLocal
from app.core.storage import storage
from app.ml.infrastructure_cv import infrastructure_cv

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="app.tasks.infrastructure_tasks.process_lab_photo_cv")
def process_lab_photo_cv(self, storage_path: str):
    """Background task to run YOLOv8 equipment detection on high-res lab photos."""
    try:
        file_bytes = storage.get_bytes(storage_path)
        report = infrastructure_cv.analyze_photo(file_bytes)
        return {"status": "success", "counts": report.equipment_counts}
    except Exception as exc:
        logger.error(f"Infrastructure task failed: {exc}")
        return {"status": "error", "error": str(exc)}
