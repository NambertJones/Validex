"""Pydantic schemas for compliance rules and evaluations."""

from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel
from app.models.compliance_rule import RuleCategory


class ComplianceRuleBase(BaseModel):
    rule_code: str
    title: str
    category: RuleCategory
    description: str
    conditions: dict[str, Any]
    is_active: bool = True


class ComplianceRuleCreate(ComplianceRuleBase):
    pass


class ComplianceRuleUpdate(BaseModel):
    title: str | None = None
    category: RuleCategory | None = None
    description: str | None = None
    conditions: dict[str, Any] | None = None
    is_active: bool | None = None


class ComplianceRuleResponse(ComplianceRuleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComplianceCheckItem(BaseModel):
    rule_code: str
    title: str
    category: RuleCategory
    status: str  # "compliant" | "non_compliant" | "warning" | "not_applicable"
    message: str
    evidence: str | None = None


class ComplianceEvaluationResponse(BaseModel):
    application_id: UUID
    total_rules_evaluated: int
    compliant_count: int
    deficiency_count: int
    compliance_score: float  # Percentage 0-100%
    results: list[ComplianceCheckItem]
