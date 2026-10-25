"""Celery application instance and configuration."""

from celery import Celery

from app.core.config import settings

celery = Celery(
    "aicte_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.ocr_tasks",
        "app.tasks.forgery_tasks",
        "app.tasks.verification_tasks",
        "app.tasks.infrastructure_tasks",
        "app.tasks.notification_tasks",
    ],
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    # Task routing
    task_routes={
        "app.tasks.ocr_tasks.*": {"queue": "ocr"},
        "app.tasks.forgery_tasks.*": {"queue": "forgery"},
        "app.tasks.verification_tasks.*": {"queue": "verification"},
        "app.tasks.infrastructure_tasks.*": {"queue": "cv"},
        "app.tasks.notification_tasks.*": {"queue": "notifications"},
    },
    # Default queue for unrouted tasks
    task_default_queue="default",
)
