"""Compliance rule engine endpoints for AICTE norms."""

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.compliance_rule import ComplianceRule
from app.schemas.compliance import (
    ComplianceRuleCreate,
    ComplianceRuleUpdate,
    ComplianceRuleResponse,
    ComplianceEvaluationResponse,
)
from app.services.compliance_service import compliance_service

router = APIRouter(prefix="/compliance", tags=["Compliance Rules Engine"])


@router.get("/rules", response_model=list[ComplianceRuleResponse])
def list_compliance_rules(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all active AICTE compliance rules and validation thresholds."""
    compliance_service.seed_default_rules(db)
    rules = db.query(ComplianceRule).order_by(ComplianceRule.category).all()
    return rules


@router.post("/rules", response_model=ComplianceRuleResponse, status_code=status.HTTP_201_CREATED)
def create_compliance_rule(
    rule_in: ComplianceRuleCreate,
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN]))],
    db: Annotated[Session, Depends(get_db)],
):
    """Admin only: Create or adjust an official AICTE Approval Process Handbook norm."""
    existing = db.query(ComplianceRule).filter(ComplianceRule.rule_code == rule_in.rule_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Rule code already exists")

    rule = ComplianceRule(**rule_in.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/check/{app_id}", response_model=ComplianceEvaluationResponse)
def evaluate_application_compliance(
    app_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Evaluate application adherence against all active AICTE statutory norms."""
    return compliance_service.evaluate_compliance(db=db, application_id=app_id)
