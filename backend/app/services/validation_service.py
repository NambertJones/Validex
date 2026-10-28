"""Application pre-screening: turns document evidence, rules, source verifications, duplicates and
AICTE records into evidence-linked findings, an explained risk score and an advisory recommendation.

The official application status is not changed beyond moving SUBMITTED -> UNDER_REVIEW;
every decision stays with an authorised official.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.application import AIRecommendation, Application, ApplicationStatus
from app.models.document import Document, DocumentStatus, DocumentType
from app.models.notification import Notification, NotificationStatus
from app.models.validation_result import CheckType, Severity, ValidationResult
from app.models.verification import VerificationMethod, VerificationStatus
from app.services.audit_service import audit_service
from app.services.compliance_service import compliance_service
from app.services.matching import compare_field
from app.services.records_service import records_service
from app.services.verification_service import verification_service

SEVERITY_POINTS = {Severity.CRITICAL: 25.0, Severity.WARNING: 8.0, Severity.INFO: 0.0}
METHOD_LABEL = {"api": "registry lookup", "digital_signature": "signed QR", "qr_code": "QR code", "manual": "manual"}
NAME_FIELDS = ["holder", "client_name", "institution_name", "deponent_institution"]


def _finding(app: Application, check: CheckType, severity: Severity, finding: str, evidence: str | None = None,
             document: Document | None = None, fix_hint: str | None = None, details: dict | None = None,
             confidence: float = 1.0, rule: dict[str, Any] | None = None) -> ValidationResult:
    return ValidationResult(
        application_id=app.id, document_id=document.id if document else None, check_type=check, severity=severity,
        finding=finding[:500], evidence=(evidence or "")[:2000] or None, fix_hint=fix_hint, details=details or {},
        confidence=confidence, rule_code=rule["rule_code"] if rule else None, rule_version=rule["rule_version"] if rule else None,
    )


class ValidationService:
    def validate_application(self, db: Session, application_id: uuid.UUID, user_id: uuid.UUID | None = None) -> dict[str, Any]:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise ValueError("Application not found")
        docs = [d for d in app.documents if d.is_current]
        doc_by_type = {}
        for d in docs:
            doc_by_type.setdefault(d.doc_type, d)

        # Retry source verifications that are pending / unavailable / never run
        for d in docs:
            if verification_service.supports(d) and d.status != DocumentStatus.PROCESSING and verification_service.needs_rerun(d):
                verification_service.verify_document(db, d.id, user_id=user_id)
                db.refresh(d)

        db.query(ValidationResult).filter(ValidationResult.application_id == app.id).delete()
        db.commit()

        records, records_status = records_service.fetch(app)
        findings: list[ValidationResult] = []
        outcomes = compliance_service.evaluate(db, app, docs, records, records_status)
        findings += self._rule_findings(app, outcomes, doc_by_type)
        findings += self._document_findings(app, docs)
        findings += self._verification_findings(app, docs)
        findings += self._consistency_findings(app, docs, records, records_status)

        for f in findings:
            db.add(f)

        crit = sum(1 for f in findings if f.severity == Severity.CRITICAL)
        warn = sum(1 for f in findings if f.severity == Severity.WARNING)
        contributions = [{"finding": f.finding, "severity": f.severity.value, "points": SEVERITY_POINTS[f.severity]}
                         for f in findings if SEVERITY_POINTS[f.severity] > 0]
        app.risk_score = round(min(sum(c["points"] for c in contributions), 100.0), 1)
        app.ai_recommendation, app.ai_summary = self._recommend(findings, crit, warn)
        app.ai_reviewed_at = datetime.now(timezone.utc)
        if app.status == ApplicationStatus.SUBMITTED:
            app.status = ApplicationStatus.UNDER_REVIEW
        db.commit()

        resolved = self._resolve_notifications(db, app, findings)

        audit_service.log_event(
            db=db, action="AI_PRESCREENING_COMPLETED", user_id=user_id, application_id=app.id,
            details={
                "risk_score": app.risk_score, "recommendation": app.ai_recommendation.value,
                "critical": crit, "warnings": warn,
                "rules_applied": [{"code": o["rule_code"], "version": o["rule_version"], "status": o["status"]} for o in outcomes],
                "records_source": {"permanent_id": app.permanent_id, "status": records_status},
                "documents_checked": [str(d.id) for d in docs],
                "notices_resolved": resolved,
            },
        )
        return {
            "application_id": str(app.id), "risk_score": app.risk_score,
            "ai_recommendation": app.ai_recommendation.value, "ai_summary": app.ai_summary,
            "status": app.status.value, "critical_count": crit, "warning_count": warn,
            "findings_count": len(findings), "risk_contributions": contributions, "records_status": records_status,
        }

    # ------------------------------------------------------------------ rules
    @staticmethod
    def _rule_findings(app: Application, outcomes: list[dict[str, Any]], doc_by_type: dict) -> list[ValidationResult]:
        out = []
        for o in outcomes:
            if o["status"] in ("pass", "not_applicable"):
                continue
            doc = doc_by_type.get(DocumentType(o["doc_type"])) if o.get("doc_type") else None
            fact = o.get("fact") or ""
            check = (CheckType.COMPLETENESS if o.get("kind") == "missing_document"
                     else CheckType.EXPIRY if o.get("op") == "not_expired"
                     else CheckType.RECORDS if fact.startswith("records.")
                     else CheckType.INFRASTRUCTURE if fact.startswith("infra.")
                     else CheckType.COMPLIANCE)
            severity = Severity(o["severity"]) if o["status"] == "fail" else Severity.WARNING
            field = fact.split(".")[-1] if fact.startswith("docs.") else None
            loc = ((doc.extracted_data or {}).get("field_locations") or {}).get(field.replace("_iso", "")) if doc and field else None
            out.append(_finding(
                app, check, severity, f"{o['title']}: {o['message']}",
                evidence=(f"Rule {o['rule_code']} v{o['rule_version']}; expected {o.get('op', '')} {o.get('expected') or ''}; "
                          f"found {o.get('actual') if o.get('actual') is not None else 'nothing'}"
                          + (f" in {doc.original_filename}" if doc else "")),
                document=doc, fix_hint=o.get("fix_hint"), rule=o,
                details={"rule": o, "boxes": [loc] if loc and "x" in loc else []},
                confidence=1.0 if o["status"] == "fail" else 0.6,
            ))
        return out

    # -------------------------------------------------------------- documents
    @staticmethod
    def _document_findings(app: Application, docs: list[Document]) -> list[ValidationResult]:
        out = []
        for d in docs:
            data = d.extracted_data or {}
            if d.status in (DocumentStatus.PENDING, DocumentStatus.PROCESSING):
                out.append(_finding(app, CheckType.COMPLETENESS, Severity.INFO, f"{d.original_filename} is still being processed",
                                    document=d, details={"stage": d.processing_stage}))
                continue
            if d.status == DocumentStatus.FAILED:
                out.append(_finding(app, CheckType.COMPLETENESS, Severity.WARNING, f"{d.original_filename} could not be processed",
                                    evidence=d.processing_stage, document=d,
                                    fix_hint="Re-upload a clear PDF or image of this document."))
                continue

            forensics = data.get("forensics") or {}
            if forensics.get("is_suspected"):
                strong = forensics.get("level") == "high"
                indicators = forensics.get("indicators", [])
                out.append(_finding(
                    app, CheckType.FORGERY, Severity.CRITICAL if strong else Severity.WARNING,
                    f"Possible alteration in {d.original_filename} ({forensics.get('level')} likelihood) — needs verification",
                    evidence="; ".join(f"[{i['method']}, {i['strength']}] {i['description']}" for i in indicators),
                    document=d, confidence=0.9 if strong else 0.6,
                    fix_hint="Upload the original document as issued by the authority (do not edit or re-save it).",
                    details={"indicators": indicators, "boxes": [b for i in indicators for b in i.get("boxes", [])],
                             "disclaimer": forensics.get("disclaimer")},
                ))

            for dup in data.get("duplicates") or []:
                if dup.get("same_application") and dup["match"] == "exact_file":
                    sev, msg = Severity.INFO, f"{d.original_filename} was uploaded more than once in this application"
                else:
                    sev = Severity.WARNING if dup["match"] != "identifier_reuse" else Severity.CRITICAL
                    msg = (f"{d.original_filename}: {dup['reason']} — also in {dup['application_number']} "
                           f"({dup['institution_name']})")
                out.append(_finding(app, CheckType.DUPLICATE, sev, msg, evidence=dup["reason"], document=d,
                                    details={"duplicate": dup}, confidence=0.95 if dup["match"] != "near_duplicate_image" else 0.8,
                                    fix_hint="Submit evidence that belongs to this institution and campus."))

            cls = data.get("classification") or {}
            if cls.get("mismatch"):
                out.append(_finding(app, CheckType.COMPLETENESS, Severity.WARNING, f"Possible wrong document in slot: {d.original_filename}",
                                    evidence=cls["mismatch"], document=d,
                                    fix_hint=f"Check that this file is the {d.doc_type.value.replace('_', ' ')} and re-upload in the right slot."))
            ocr = data.get("ocr") or {}
            if ocr and ocr.get("confidence", 1) < 0.6 and d.doc_type != DocumentType.LAB_PHOTO:
                out.append(_finding(app, CheckType.COMPLETENESS, Severity.WARNING, f"{d.original_filename} is hard to read (OCR confidence {ocr.get('confidence', 0):.0%})",
                                    evidence=f"OCR engine: {ocr.get('engine')}", document=d,
                                    fix_hint="Upload the digital original or a sharper scan (300 dpi)."))

            cv = data.get("infrastructure")
            if cv:
                for issue in (cv.get("evidence_quality") or {}).get("issues", []):
                    out.append(_finding(app, CheckType.INFRASTRUCTURE, Severity.WARNING, f"{d.original_filename}: {issue}",
                                        document=d, fix_hint="Upload a clear, well-lit, wide-angle photo or walkthrough video."))
                if cv.get("status") != "analyzed":
                    out.append(_finding(app, CheckType.INFRASTRUCTURE, Severity.INFO,
                                        f"{d.original_filename}: automated equipment detection unavailable ({cv.get('status')}); manual review",
                                        document=d))
                for flag in cv.get("compliance_flags", []):
                    if flag["status"] == "not_detectable":
                        out.append(_finding(app, CheckType.INFRASTRUCTURE, Severity.INFO, f"{flag['equipment']}: {flag['message']}", document=d))
        return out

    # ----------------------------------------------------------- verification
    @staticmethod
    def _verification_findings(app: Application, docs: list[Document]) -> list[ValidationResult]:
        out = []
        sev_map = {
            VerificationStatus.MISMATCH: Severity.CRITICAL, VerificationStatus.EXPIRED: Severity.CRITICAL,
            VerificationStatus.MANUAL_REVIEW: Severity.WARNING, VerificationStatus.UNAVAILABLE: Severity.INFO,
            VerificationStatus.PENDING: Severity.INFO,
        }
        for d in docs:
            for v in verification_service.latest_by_method(d):
                if v.status == VerificationStatus.VERIFIED:
                    continue
                if v.method == VerificationMethod.MANUAL and v.source_authority == "No automated source":
                    continue  # recorded on the document; not an issue in itself
                sev = sev_map[v.status]
                label = {"mismatch": "mismatch detected", "expired": "expired at source", "manual_review": "manual review required",
                         "unavailable": "source unavailable (retry scheduled)", "pending": "verification pending"}[v.status.value]
                out.append(_finding(
                    app, CheckType.VERIFICATION, sev, f"{d.original_filename}: {v.source_authority} ({METHOD_LABEL.get(v.method.value, v.method.value)}) — {label}",
                    evidence=v.reason, document=d, confidence=0.97 if v.status in (VerificationStatus.MISMATCH, VerificationStatus.EXPIRED) else 0.7,
                    fix_hint=("Upload the certificate exactly as issued; the details do not match the issuing authority's record."
                              if v.status == VerificationStatus.MISMATCH else
                              "Renew the certificate with the issuing authority and upload the new one."
                              if v.status == VerificationStatus.EXPIRED else None),
                    details={"verification_id": str(v.id), "method": v.method.value, "status": v.status.value,
                             "field_comparison": v.field_comparison or [], "attempts": v.attempts,
                             "next_retry_at": v.next_retry_at.isoformat() if v.next_retry_at else None},
                ))
        return out

    # ------------------------------------------------------------ consistency
    @staticmethod
    def _consistency_findings(app: Application, docs: list[Document], records: dict | None, records_status: str) -> list[ValidationResult]:
        out = []
        if records_status == "unavailable":
            out.append(_finding(app, CheckType.RECORDS, Severity.INFO, "AICTE institutional records are temporarily unavailable; record-based checks will re-run"))
        elif records_status == "not_found":
            out.append(_finding(app, CheckType.RECORDS, Severity.WARNING, f"No AICTE record found for permanent ID {app.permanent_id}",
                                fix_hint="Check the AICTE permanent institute ID entered on the application."))
        elif records_status == "no_permanent_id" and app.category.value != "new_institution":
            out.append(_finding(app, CheckType.RECORDS, Severity.WARNING, "Application has no AICTE permanent ID; institutional records could not be consulted",
                                fix_hint="Enter the AICTE permanent institute ID on the application."))

        reference_names = [("application", app.institution_name)]
        if records:
            reference_names.append(("AICTE records", records.get("name")))
        for d in docs:
            data = d.extracted_data or {}
            for field in NAME_FIELDS:
                value = data.get(field)
                if not value:
                    continue
                rows = [compare_field(f"{field} vs {src}", value, ref, "name") for src, ref in reference_names if ref]
                bad = [r for r in rows if r["match"] is False]
                if bad:
                    loc = (data.get("field_locations") or {}).get(field)
                    out.append(_finding(
                        app, CheckType.CONSISTENCY, Severity.WARNING,
                        f"Institution name on {d.original_filename} does not match",
                        evidence="; ".join(f"'{r['submitted']}' vs {r['field'].split(' vs ')[1]} '{r['official']}' ({r['reason']})" for r in bad),
                        document=d, confidence=0.85, details={"field_comparison": rows, "boxes": [loc] if loc and "x" in loc else []},
                        fix_hint="Ensure the document is issued in the institution's registered name, or explain the difference.",
                    ))
                break

        if records:
            land = next((d for d in docs if d.doc_type == DocumentType.LAND_DOCUMENT), None)
            if land:
                rows = [compare_field("land_area_acres", (land.extracted_data or {}).get("land_area_acres"), records.get("land_area_acres"), "number"),
                        compare_field("owner vs trust on record", (land.extracted_data or {}).get("owner"), records.get("trust"), "name")]
                bad = [r for r in rows if r["match"] is False]
                if bad:
                    out.append(_finding(app, CheckType.RECORDS, Severity.WARNING, f"Land deed differs from AICTE records",
                                        evidence="; ".join(f"{r['field']}: {r['reason']}" for r in bad), document=land,
                                        details={"field_comparison": rows}))
            fac = next((d for d in docs if d.doc_type == DocumentType.FACULTY_LIST), None)
            declared = (fac.extracted_data or {}).get("total_faculty") if fac else None
            on_record = records.get("faculty_on_record")
            if declared and on_record and declared > on_record * 1.25:
                out.append(_finding(app, CheckType.RECORDS, Severity.WARNING,
                                    f"Faculty list declares {declared} faculty but AICTE records show {on_record}",
                                    evidence="Newly declared faculty should be registered on the AICTE faculty portal.",
                                    document=fac, fix_hint="Register all declared faculty on the AICTE portal with unique IDs."))
        return out

    # --------------------------------------------------------- recommendation
    @staticmethod
    def _recommend(findings: list[ValidationResult], crit: int, warn: int) -> tuple[AIRecommendation, str]:
        forgery = [f for f in findings if f.check_type in (CheckType.FORGERY, CheckType.VERIFICATION, CheckType.DUPLICATE)
                   and f.severity == Severity.CRITICAL]
        infra = [f for f in findings if f.check_type == CheckType.INFRASTRUCTURE and f.severity != Severity.INFO]
        if forgery:
            return AIRecommendation.DEFICIENCY, (f"{len(forgery)} authenticity concern(s) (tampering indicators, source mismatch "
                                                 f"or re-used identifiers) and {crit} critical finding(s) in total. Verify before any decision.")
        if crit:
            return AIRecommendation.DEFICIENCY, f"{crit} critical and {warn} other finding(s) against the checklist. Consider a deficiency notice."
        if infra:
            return AIRecommendation.INSPECTION, "Documents are in order but infrastructure evidence is insufficient; additional evidence or inspection suggested."
        if warn:
            return AIRecommendation.CLARIFICATION, f"{warn} item(s) need clarification; no critical issues found."
        return AIRecommendation.FORWARD, "All configured checks passed and sources verified. Forward for the competent authority's decision."

    @staticmethod
    def _resolve_notifications(db: Session, app: Application, findings: list[ValidationResult]) -> int:
        open_codes = {f.rule_code for f in findings if f.severity != Severity.INFO and f.rule_code}
        open_issues = any(f.severity == Severity.CRITICAL for f in findings)
        resolved = 0
        for n in db.query(Notification).filter(Notification.application_id == app.id,
                                               Notification.status != NotificationStatus.RESOLVED).all():
            item_codes = {i.get("rule_code") for i in n.items if i.get("rule_code")}
            if not open_issues and not (item_codes & open_codes):
                n.status = NotificationStatus.RESOLVED
                resolved += 1
        db.commit()
        return resolved


validation_service = ValidationService()
