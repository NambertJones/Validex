"""Celery task for background third-party authority verification."""

import logging
from app.core.celery_app import celery
from app.core.database import SessionLocal
from app.services.verification_service import verification_service

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="app.tasks.verification_tasks.verify_document_task", max_retries=3)
def verify_document_task(self, document_id: str, authority: str = "DigiLocker"):
    """Background task to query state authority / DigiLocker APIs."""
    db = SessionLocal()
    try:
        import uuid
        ver = verification_service.verify_document(
            db=db,
            document_id=uuid.UUID(document_id),
            source_authority=authority,
        )
        return {"status": "success", "verification_id": str(ver.id), "result": ver.status.value}
    except Exception as exc:
        logger.error(f"Verification task error: {exc}")
        db.rollback()
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()
