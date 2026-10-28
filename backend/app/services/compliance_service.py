"""Compliance rules: default AICTE checklist, versioned edits, and per-application evaluation."""

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.compliance_rule import ComplianceRule, RuleCategory
from app.models.document import Document
from app.models.validation_result import Severity
from app.schemas.compliance import ComplianceEvaluationResponse, ComplianceCheckItem
from app.services import rule_engine
from app.services.records_service import records_service

SCHEMA_VERSION = 2
ALL_EXISTING = ["eoa", "change_intake", "closure", "other"]

# Thresholds are prototype defaults and must be configured to the current Approval Process Handbook.
DEFAULT_RULES: list[dict[str, Any]] = [
    {
        "rule_code": "COMP-FIRE-01", "title": "Valid Fire Safety NOC", "category": RuleCategory.SAFETY,
        "severity": Severity.CRITICAL,
        "description": "A Fire NOC from the competent State Fire authority, valid on the date of scrutiny.",
        "conditions": {"requires_doc": "fire_safety",
                       "check": {"fact": "docs.fire_safety.valid_until_iso", "op": "not_expired", "label": "Fire NOC validity"},
                       "fix_hint": "Upload the current Fire NOC issued by the State Fire Services. The certificate submitted has lapsed or its validity date could not be read."},
    },
    {
        "rule_code": "COMP-LAND-02", "title": "Minimum land area", "category": RuleCategory.INFRASTRUCTURE,
        "severity": Severity.CRITICAL,
        "description": "Registered land in the name of the Trust/Society meeting the minimum area for the location.",
        "conditions": {"requires_doc": "land_document",
                       "check": {"fact": "docs.land_document.land_area_acres", "op": ">=", "value": 2.5, "label": "Land area (acres)"},
                       "fix_hint": "Upload the registered land/title deed showing the full contiguous land area in the Trust's name."},
    },
    {
        "rule_code": "COMP-FAC-03", "title": "Student-faculty ratio 1:20", "category": RuleCategory.ACADEMIC,
        "severity": Severity.CRITICAL,
        "description": "Regular faculty must be at least intake / 20.",
        "conditions": {"requires_doc": "faculty_list",
                       "check": {"fact": "docs.faculty_list.total_faculty", "op": ">=", "value": {"fact": "computed.required_faculty"}, "label": "Regular faculty"},
                       "fix_hint": "Recruit or declare additional regular faculty so that faculty ≥ intake/20, and upload the updated faculty list."},
    },
    {
        "rule_code": "COMP-FIN-04", "title": "Audited financials with UDIN", "category": RuleCategory.FINANCIAL,
        "severity": Severity.CRITICAL,
        "description": "Audited statements certified by a practising Chartered Accountant with a valid 18-character UDIN.",
        "conditions": {"requires_doc": "audit_report",
                       "check": {"fact": "docs.audit_report.udin", "op": "exists", "label": "ICAI UDIN"},
                       "fix_hint": "Upload the audited statement that carries the CA's UDIN, generated on the ICAI UDIN portal."},
    },
    {
        "rule_code": "COMP-STAT-05", "title": "Notarised affidavit on stamp paper", "category": RuleCategory.STATUTORY,
        "severity": Severity.CRITICAL,
        "description": "Affidavit on non-judicial / e-stamp paper affirming adherence to AICTE norms.",
        "conditions": {"requires_doc": "affidavit",
                       "check": {"fact": "docs.affidavit.stamp_certificate_no", "op": "exists", "label": "e-Stamp certificate number"},
                       "fix_hint": "Upload the notarised affidavit on e-stamp paper; the stamp certificate number must be legible."},
    },
    {
        "rule_code": "COMP-NOC-06", "title": "Valid NOC from affiliating university", "category": RuleCategory.STATUTORY,
        "severity": Severity.CRITICAL,
        "description": "NOC / affiliation consent from the affiliating university valid for the academic year.",
        "conditions": {"requires_doc": "noc",
                       "check": {"fact": "docs.noc.valid_until_iso", "op": "not_expired", "label": "University NOC validity"},
                       "fix_hint": "Upload the current NOC from the affiliating university covering this academic year."},
    },
    {
        "rule_code": "COMP-BLD-07", "title": "Classroom carpet area", "category": RuleCategory.INFRASTRUCTURE,
        "severity": Severity.WARNING,
        "description": "Approved building plan; each classroom at least 66 sq m.",
        "conditions": {"requires_doc": "building_plan",
                       "check": {"fact": "docs.building_plan.min_classroom_area_sqm", "op": ">=", "value": 66, "label": "Smallest classroom (sq m)"},
                       "fix_hint": "Upload the sanctioned building plan with room-wise carpet areas; classrooms must meet the 66 sq m norm."},
    },
    {
        "rule_code": "COMP-LAB-08", "title": "Computer lab workstations", "category": RuleCategory.INFRASTRUCTURE,
        "severity": Severity.WARNING,
        "description": "Photographic evidence of the computer laboratory showing the required workstations.",
        "conditions": {"requires_doc": "lab_photo",
                       "check": {"fact": "infra.computer", "op": ">=", "value": 15, "label": "Computer workstations visible"},
                       "fix_hint": "Upload clear, well-lit wide-angle photos or a walkthrough video of each computer lab showing all workstations."},
    },
    {
        "rule_code": "COMP-TER-09", "title": "TER fee paid for the academic year", "category": RuleCategory.FINANCIAL,
        "severity": Severity.CRITICAL, "applies_to": ALL_EXISTING,
        "description": "Tuition-fee/E-governance (TER) payment recorded in AICTE systems for the academic year.",
        "conditions": {"check": {"fact": "records.ter_payment_current", "op": "==", "value": "paid", "label": "TER payment status"},
                       "fix_hint": "Pay the TER fee for this academic year on the AICTE portal; the payment is not yet reflected in AICTE records."},
    },
    {
        "rule_code": "COMP-DEF-10", "title": "No unresolved deficiencies from previous cycle", "category": RuleCategory.STATUTORY,
        "severity": Severity.WARNING, "applies_to": ALL_EXISTING,
        "description": "Deficiencies recorded in the previous approval cycle should be closed.",
        "conditions": {"check": {"fact": "records.open_deficiency_count", "op": "==", "value": 0, "label": "Open deficiencies on record"},
                       "fix_hint": "Submit compliance evidence for deficiencies raised in the previous approval cycle."},
    },
    {
        "rule_code": "COMP-INT-11", "title": "Intake within approved intake", "category": RuleCategory.ACADEMIC,
        "severity": Severity.WARNING, "applies_to": ["eoa"],
        "description": "An EoA application cannot raise intake; increases need a Change-in-Intake application.",
        "conditions": {"check": {"fact": "app.requested_intake", "op": "<=", "value": {"fact": "records.approved_intake"}, "label": "Requested intake"},
                       "on_missing_fact": "skip",
                       "fix_hint": "Apply for the approved intake, or file a separate Change-in-Intake application."},
    },
]


class ComplianceService:
    def seed_default_rules(self, db: Session) -> None:
        """Insert missing default rules and upgrade legacy (pre-engine) rules in place."""
        changed = False
        for spec in DEFAULT_RULES:
            existing = db.query(ComplianceRule).filter(ComplianceRule.rule_code == spec["rule_code"]).first()
            conditions = {**spec["conditions"], "schema": SCHEMA_VERSION}
            if existing is None:
                db.add(ComplianceRule(
                    rule_code=spec["rule_code"], title=spec["title"], category=spec["category"],
                    description=spec["description"], conditions=conditions, severity=spec["severity"],
                    applies_to=spec.get("applies_to", []), version=1, is_active=True,
                    handbook_reference="AICTE Approval Process Handbook (configure clause for current edition)",
                ))
                changed = True
            elif (existing.conditions or {}).get("schema") != SCHEMA_VERSION:
                existing.title, existing.description = spec["title"], spec["description"]
                existing.conditions, existing.severity = conditions, spec["severity"]
                existing.applies_to = spec.get("applies_to", [])
                existing.version = (existing.version or 1) + 1
                changed = True
        if changed:
            db.commit()

    def active_rules(self, db: Session) -> list[ComplianceRule]:
        return db.query(ComplianceRule).filter(ComplianceRule.is_active.is_(True)).order_by(ComplianceRule.rule_code).all()

    def checklist(self, db: Session, app: Application) -> list[dict[str, Any]]:
        """Documents required for this application's category (drives the institution upload checklist)."""
        out = []
        for r in self.active_rules(db):
            req = (r.conditions or {}).get("requires_doc")
            if req and rule_engine.rule_applies(r, app):
                out.append({"doc_type": req, "rule_code": r.rule_code, "title": r.title,
                            "description": r.description, "fix_hint": (r.conditions or {}).get("fix_hint")})
        return out

    def evaluate(self, db: Session, app: Application, docs: list[Document] | None = None,
                 records: dict[str, Any] | None = None, records_status: str | None = None) -> list[dict[str, Any]]:
        if docs is None:
            docs = [d for d in app.documents if d.is_current]
        if records_status is None:
            records, records_status = records_service.fetch(app)
        facts = rule_engine.build_facts(app, docs, records, records_status)
        return [rule_engine.evaluate_rule(r, facts) for r in self.active_rules(db) if rule_engine.rule_applies(r, app)]

    def evaluate_compliance(self, db: Session, application_id: uuid.UUID) -> ComplianceEvaluationResponse:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise ValueError("Application not found")
        outcomes = self.evaluate(db, app)
        items = []
        for o in outcomes:
            status = {"pass": "compliant", "fail": "non_compliant", "manual_review": "warning"}.get(o["status"], "not_applicable")
            items.append(ComplianceCheckItem(
                rule_code=o["rule_code"], title=o["title"], category=RuleCategory(o["category"]), status=status,
                message=o["message"], evidence=o.get("evidence"), rule_version=o["rule_version"],
                expected=o.get("expected"), actual=o.get("actual"), fix_hint=o.get("fix_hint"),
            ))
        compliant = sum(1 for i in items if i.status == "compliant")
        deficient = sum(1 for i in items if i.status == "non_compliant")
        evaluated = sum(1 for i in items if i.status != "not_applicable")
        return ComplianceEvaluationResponse(
            application_id=app.id,
            total_rules_evaluated=evaluated,
            compliant_count=compliant,
            deficiency_count=deficient,
            compliance_score=round(compliant / evaluated * 100.0, 1) if evaluated else 100.0,
            results=items,
        )


compliance_service = ComplianceService()
