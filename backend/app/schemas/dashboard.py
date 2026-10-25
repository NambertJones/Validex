"""Pydantic schemas for executive dashboard metrics, alerts, and timeline."""

from datetime import datetime
from pydantic import BaseModel


class StatMetric(BaseModel):
    value: int | float
    change_pct: float | None = None
    label: str


class DashboardStatsResponse(BaseModel):
    total_applications: int
    under_review: int
    deficiency_found: int
    verified_approved: int
    high_risk_flagged: int
    avg_processing_time_hours: float
    total_documents_processed: int
    forgery_detected_count: int


class RiskDistributionItem(BaseModel):
    category: str  # "Low Risk", "Medium Risk", "High Risk", "Critical"
    count: int
    color: str


class AlertItem(BaseModel):
    id: str
    application_id: str
    application_number: str
    institution_name: str
    title: str
    severity: str  # "critical", "warning", "info"
    message: str
    created_at: datetime


class ActivityItem(BaseModel):
    id: str
    action: str
    user_name: str
    institution_name: str
    timestamp: datetime
    details: str
