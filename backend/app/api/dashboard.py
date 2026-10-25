"""Dashboard metrics and live feeds endpoints."""

from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.dashboard import (
    DashboardStatsResponse,
    RiskDistributionItem,
    AlertItem,
    ActivityItem,
)
from app.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get high-level summary KPIs for applications, risk alerts, and turnaround time."""
    return dashboard_service.get_stats(db)


@router.get("/risk-distribution", response_model=list[RiskDistributionItem])
def get_risk_distribution(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get categorization counts across Low, Medium, High, and Critical risk tiers."""
    return dashboard_service.get_risk_distribution(db)


@router.get("/alerts", response_model=list[AlertItem])
def get_alerts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 10,
):
    """Get recent critical and warning flags requiring official attention."""
    return dashboard_service.get_alerts(db, limit=limit)


@router.get("/recent-activity", response_model=list[ActivityItem])
def get_recent_activity(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 15,
):
    """Get live audit events and processing milestones."""
    return dashboard_service.get_recent_activity(db, limit=limit)
