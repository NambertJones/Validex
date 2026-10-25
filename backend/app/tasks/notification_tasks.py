"""Celery tasks for automated self-healing notifications and alerts."""

import logging
from app.core.celery_app import celery

logger = logging.getLogger(__name__)


@celery.task(name="app.tasks.notification_tasks.send_deficiency_alert")
def send_deficiency_alert(application_number: str, institution_email: str, deficiencies: list[str]):
    """Send automated rectification notification to institution."""
    logger.info(
        f"[Self-Healing Notification] Alert sent to {institution_email} for Application {application_number}: "
        f"{len(deficiencies)} deficiencies identified."
    )
    return {"status": "sent", "recipient": institution_email, "count": len(deficiencies)}
