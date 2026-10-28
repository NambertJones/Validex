"""Deficiency notices to institutions: evidence-linked, actionable, with a rectification deadline."""

import logging
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.application import Application
from app.models.notification import Notification
from app.models.user import User
from app.models.validation_result import Severity, ValidationResult
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    if not settings.SMTP_HOST:
        return False
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = settings.SMTP_FROM, to, subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
            s.starttls()
            if settings.SMTP_USER:
                s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            s.send_message(msg)
        return True
    except Exception as e:
        logger.warning(f"Email delivery failed: {e}")
        return False


class NotificationService:
    def issue_deficiency_notice(self, db: Session, app: Application, sender: User, notes: str,
                                due_days: int = 7, finding_ids: list[uuid.UUID] | None = None) -> Notification:
        q = db.query(ValidationResult).filter(ValidationResult.application_id == app.id,
                                              ValidationResult.severity.in_([Severity.CRITICAL, Severity.WARNING]))
        if finding_ids:
            q = q.filter(ValidationResult.id.in_(finding_ids))
        findings = q.all()
        items = [{
            "finding_id": str(f.id), "document_id": str(f.document_id) if f.document_id else None,
            "doc_type": f.document.doc_type.value if f.document else None,
            "filename": f.document.original_filename if f.document else None,
            "severity": f.severity.value, "message": f.finding,
            "fix_hint": f.fix_hint or "Provide clarification or corrected evidence.", "rule_code": f.rule_code,
        } for f in findings]
        due = datetime.now(timezone.utc) + timedelta(days=due_days)
        lines = [f"{i + 1}. {it['message']}\n   What to do: {it['fix_hint']}" for i, it in enumerate(items)]
        body = (f"Application {app.application_number} ({app.institution_name})\n\n"
                f"The scrutiny officer has identified the following items. Please rectify them by "
                f"{due.strftime('%d %b %Y')} by uploading corrected documents against each item; there is no need "
                f"to resubmit the whole application.\n\nOfficer's note: {notes}\n\n" + "\n".join(lines))
        recipient = db.query(User).filter(User.id == app.institution_id).first()
        n = Notification(application_id=app.id, recipient_id=app.institution_id, sender_id=sender.id,
                         subject=f"Action required: {len(items)} item(s) on application {app.application_number}",
                         body=body[:4000], items=items, channels=["in_app"], due_date=due)
        if recipient and settings.USE_CELERY:
            from app.tasks.notification_tasks import send_deficiency_email
            send_deficiency_email.delay(recipient.email, n.subject, body)
            n.channels = ["in_app", "email"]
        elif recipient and send_email(recipient.email, n.subject, body):
            n.channels = ["in_app", "email"]
        db.add(n)
        app.rectification_due = due
        db.commit()
        db.refresh(n)
        audit_service.log_event(
            db=db, action="DEFICIENCY_NOTICE_ISSUED", user_id=sender.id, application_id=app.id,
            details={"notification_id": str(n.id), "items": len(items), "due": due.isoformat(), "channels": n.channels,
                     "finding_ids": [it["finding_id"] for it in items]},
        )
        return n


notification_service = NotificationService()
