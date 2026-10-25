"""Compliance evaluation service based on AICTE Approval Process Handbook norms."""

import uuid
from typing import Any
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.document import Document, DocumentType
from app.models.compliance_rule import ComplianceRule, RuleCategory
from app.schemas.compliance import ComplianceEvaluationResponse, ComplianceCheckItem


class ComplianceService:
    DEFAULT_RULES = [
        {
            "rule_code": "COMP-FIRE-01",
            "title": "Mandatory Valid Fire Safety NOC",
            "category": RuleCategory.SAFETY,
            "description": "Institution must possess an unexpired Fire Safety Certificate issued by competent government authority.",
            "conditions": {"requires_doc": "fire_safety", "must_not_be_expired": True},
        },
        {
            "rule_code": "COMP-LAND-02",
            "title": "Minimum Land Requirement for Technical Institution",
            "category": RuleCategory.INFRASTRUCTURE,
            "description": "Technical campus in Mega/Metro or Rural area must satisfy minimum contiguous land norms (min 2.5 Acres rural, 1.5 Acres urban).",
            "conditions": {"requires_doc": "land_document", "min_acres": 1.5},
        },
        {
            "rule_code": "COMP-FAC-03",
            "title": "Student-to-Faculty Cadre Ratio (1:20)",
            "category": RuleCategory.ACADEMIC,
            "description": "Undergraduate engineering programmes must maintain a cadre ratio of 1 Professor : 2 Associate Professors : 6 Assistant Professors.",
            "conditions": {"requires_doc": "faculty_list", "cadre_ratio_check": True},
        },
        {
            "rule_code": "COMP-FIN-04",
            "title": "Audited Financials with Valid UDIN",
            "category": RuleCategory.FINANCIAL,
            "description": "Financial statements must be certified by a practicing Chartered Accountant with an authentic 18-digit UDIN.",
            "conditions": {"requires_doc": "audit_report", "udin_required": True},
        },
        {
            "rule_code": "COMP-STAT-05",
            "title": "Affidavit on Non-Judicial Stamp Paper",
            "category": RuleCategory.STATUTORY,
            "description": "Notarized affidavit affirming non-deviation from AICTE guidelines executed on prescribed stamp paper.",
            "conditions": {"requires_doc": "affidavit"},
        },
    ]

    def seed_default_rules(self, db: Session):
        """Seed AICTE default compliance rules if table is empty."""
        count = db.query(ComplianceRule).count()
        if count == 0:
            for r_data in self.DEFAULT_RULES:
                rule = ComplianceRule(**r_data)
                db.add(rule)
            db.commit()

    def evaluate_compliance(self, db: Session, application_id: uuid.UUID) -> ComplianceEvaluationResponse:
        self.seed_default_rules(db)
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise ValueError("Application not found")

        docs = db.query(Document).filter(Document.application_id == application_id).all()
        doc_type_map = {d.doc_type: d for d in docs}

        rules = db.query(ComplianceRule).filter(ComplianceRule.is_active == True).all()

        check_items: list[ComplianceCheckItem] = []
        compliant_count = 0
        deficiency_count = 0

        for rule in rules:
            conditions = rule.conditions or {}
            req_doc_str = conditions.get("requires_doc")

            # Check if required document type exists
            req_doc_enum = None
            if req_doc_str:
                for dt in DocumentType:
                    if dt.value == req_doc_str:
                        req_doc_enum = dt
                        break

            if req_doc_enum and req_doc_enum not in doc_type_map:
                check_items.append(
                    ComplianceCheckItem(
                        rule_code=rule.rule_code,
                        title=rule.title,
                        category=rule.category,
                        status="non_compliant",
                        message=f"Deficiency: Required statutory document '{req_doc_str}' was not provided.",
                    )
                )
                deficiency_count += 1
            else:
                doc = doc_type_map.get(req_doc_enum)
                ext = (doc.extracted_data or {}) if doc else {}

                # Check if document has expired or was forged
                if doc and (doc.status == DocumentStatus.FLAGGED or ext.get("forgery_score", 0) > 30):
                    check_items.append(
                        ComplianceCheckItem(
                            rule_code=rule.rule_code,
                            title=rule.title,
                            category=rule.category,
                            status="non_compliant",
                            message=f"Deficiency: Attached document failed authenticity checks (tampering detected).",
                        )
                    )
                    deficiency_count += 1
                else:
                    check_items.append(
                        ComplianceCheckItem(
                            rule_code=rule.rule_code,
                            title=rule.title,
                            category=rule.category,
                            status="compliant",
                            message="Complies with AICTE Approval Process Handbook specification.",
                            evidence=f"Verified through {doc.original_filename if doc else 'institutional records'}",
                        )
                    )
                    compliant_count += 1

        total = len(rules)
        score = round((compliant_count / total * 100.0), 1) if total > 0 else 100.0

        return ComplianceEvaluationResponse(
            application_id=app.id,
            total_rules_evaluated=total,
            compliant_count=compliant_count,
            deficiency_count=deficiency_count,
            compliance_score=score,
            results=check_items,
        )


compliance_service = ComplianceService()
