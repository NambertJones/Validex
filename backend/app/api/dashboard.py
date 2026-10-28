"""Officials' dashboard: KPIs, risk distribution, alerts, activity, evaluation metrics."""

from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_official
from app.models.user import User
from app.schemas.dashboard import ActivityItem, AlertItem, DashboardStatsResponse, MetricsResponse, RiskDistributionItem
from app.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])
Official = Annotated[User, Depends(require_official)]
DB = Annotated[Session, Depends(get_db)]


@router.get("/stats", response_model=DashboardStatsResponse)
def get_stats(db: DB, current_user: Official):
    return dashboard_service.get_stats(db)


@router.get("/risk-distribution", response_model=list[RiskDistributionItem])
def get_risk_distribution(db: DB, current_user: Official):
    return dashboard_service.get_risk_distribution(db)


@router.get("/alerts", response_model=list[AlertItem])
def get_alerts(db: DB, current_user: Official, limit: int = Query(10, ge=1, le=100)):
    return dashboard_service.get_alerts(db, limit=limit)


@router.get("/recent-activity", response_model=list[ActivityItem])
def get_recent_activity(db: DB, current_user: Official, limit: int = Query(15, ge=1, le=100)):
    return dashboard_service.get_recent_activity(db, limit=limit)


@router.get("/metrics", response_model=MetricsResponse)
def get_metrics(db: DB, current_user: Official):
    return dashboard_service.get_metrics(db)
