"""Data-driven rule engine.

A rule's `conditions` JSON:
    {
      "requires_doc": "fire_safety",                       # optional: document must be present
      "check": {                                           # optional: a comparison on a fact
        "fact": "docs.fire_safety.valid_until_iso",
        "op": "not_expired",                               # >= > <= < == != exists not_expired in is_true
        "value": 2.5 | "paid" | {"fact": "computed.required_faculty"},
        "label": "Fire NOC validity"
      },
      "on_missing_fact": "manual_review" | "fail" | "skip",
      "fix_hint": "Plain-language instruction for the institution"
    }

Facts are a flat dict built per application:
    app.*        category, requested_intake, academic_year
    docs.<type>.* fields extracted from the current document of that type (+ docs.<type>.present)
    records.*    data from authorized AICTE records (approved_intake, ter_payment_current, ...)
    infra.*      equipment counts from lab photos / videos
    computed.*   derived values (required_faculty, today)
Changing a threshold is a data edit (versioned and audited), not a code change.
"""

import math
from datetime import date
from typing import Any

from app.ml.dates import parse_date, today
from app.models.application import Application
from app.models.compliance_rule import ComplianceRule
from app.models.document import Document, DocumentType

OPS = {">=", ">", "<=", "<", "==", "!=", "exists", "not_expired", "in", "is_true"}
OP_TEXT = {">=": "at least", ">": "more than", "<=": "at most", "<": "less than", "==": "equal to", "!=": "not equal to"}


def build_facts(app: Application, docs: list[Document], records: dict[str, Any] | None,
                records_status: str = "unavailable") -> dict[str, Any]:
    facts: dict[str, Any] = {
        "app.category": app.category.value,
        "app.requested_intake": app.requested_intake,
        "app.academic_year": app.academic_year,
        "computed.today": today(),
        "computed.required_faculty": math.ceil(app.requested_intake / 20) if app.requested_intake else None,
        "records.status": records_status,
    }
    for dt in DocumentType:
        facts[f"docs.{dt.value}.present"] = False

    infra: dict[str, int] = {}
    for doc in docs:
        prefix = f"docs.{doc.doc_type.value}"
        facts[f"{prefix}.present"] = True
        facts[f"{prefix}.filename"] = doc.original_filename
        for key, value in (doc.extracted_data or {}).items():
            if isinstance(value, (str, int, float, bool)) and len(str(value)) < 300:
                facts[f"{prefix}.{key}"] = parse_date(value) if key.endswith("_iso") else value
        cv = (doc.extracted_data or {}).get("infrastructure") or {}
        for obj, count in (cv.get("equipment_counts") or {}).items():
            infra[obj] = max(infra.get(obj, 0), int(count))
        if cv:
            facts["infra.status"] = cv.get("status")
    for obj, count in infra.items():
        facts[f"infra.{obj}"] = count

    if records:
        facts.update({
            "records.name": records.get("name"),
            "records.trust": records.get("trust"),
            "records.approved_intake": records.get("approved_intake"),
            "records.faculty_on_record": records.get("faculty_on_record"),
            "records.land_area_acres": records.get("land_area_acres"),
            "records.ter_payment_current": (records.get("ter_payment") or {}).get(app.academic_year, "not_found"),
            "records.open_deficiency_count": len(records.get("open_deficiencies") or []),
            "records.previous_eoa_status": ((records.get("previous_eoa") or [{}])[-1]).get("status"),
        })
    return facts


def rule_applies(rule: ComplianceRule, app: Application) -> bool:
    applies = rule.applies_to or []
    return not applies or app.category.value in applies


def _resolve(value: Any, facts: dict[str, Any]) -> Any:
    if isinstance(value, dict) and "fact" in value:
        return facts.get(value["fact"])
    return value


def _fmt(v: Any) -> str:
    if isinstance(v, date):
        return v.strftime("%d/%m/%Y")
    if isinstance(v, float):
        return f"{v:g}"
    return str(v)


def compare(op: str, actual: Any, expected: Any) -> bool:
    if op == "exists":
        return actual not in (None, "", [])
    if op == "is_true":
        return bool(actual) is True
    if op == "not_expired":
        d = actual if isinstance(actual, date) else parse_date(str(actual))
        return d is not None and d >= today()
    if op == "in":
        return actual in (expected or [])
    if isinstance(expected, (int, float)) and not isinstance(actual, (int, float)):
        actual = float(actual)
    return {
        ">=": lambda a, b: a >= b, ">": lambda a, b: a > b, "<=": lambda a, b: a <= b,
        "<": lambda a, b: a < b, "==": lambda a, b: a == b, "!=": lambda a, b: a != b,
    }[op](actual, expected)


def evaluate_rule(rule: ComplianceRule, facts: dict[str, Any]) -> dict[str, Any]:
    cond = rule.conditions or {}
    out: dict[str, Any] = {
        "rule_code": rule.rule_code,
        "rule_version": rule.version,
        "title": rule.title,
        "category": rule.category.value,
        "severity": (rule.severity.value if rule.severity else "critical"),
        "fix_hint": cond.get("fix_hint"),
        "doc_type": cond.get("requires_doc"),
        "handbook_reference": rule.handbook_reference,
    }
    req = cond.get("requires_doc")
    if req and not facts.get(f"docs.{req}.present"):
        return {**out, "status": "fail", "kind": "missing_document",
                "message": f"Required document not submitted: {req.replace('_', ' ')}"}

    check = cond.get("check")
    if not check:
        evidence = facts.get(f"docs.{req}.filename") if req else None
        return {**out, "status": "pass", "kind": "presence", "message": "Required document submitted", "evidence": evidence}

    fact, op = check.get("fact"), check.get("op")
    label = check.get("label") or fact
    if op not in OPS:
        return {**out, "status": "manual_review", "kind": "invalid_rule", "message": f"Rule has unknown operator '{op}'"}
    actual = facts.get(fact)
    expected = _resolve(check.get("value"), facts)
    out.update({"fact": fact, "op": op, "actual": _fmt(actual) if actual is not None else None,
                "expected": _fmt(expected) if expected is not None else None,
                "evidence": facts.get(f"docs.{req}.filename") if req else fact.split(".")[0]})

    if actual is None or (op not in ("exists", "is_true", "not_expired") and expected is None):
        mode = cond.get("on_missing_fact", "manual_review")
        if mode == "skip":
            return {**out, "status": "not_applicable", "kind": "missing_fact", "message": f"{label}: not applicable"}
        what = label if actual is None else f"reference value for {label}"
        return {**out, "status": "fail" if mode == "fail" else "manual_review", "kind": "missing_fact",
                "message": f"{what} could not be determined automatically; verify manually"}

    try:
        ok = compare(op, actual, expected)
    except (TypeError, ValueError):
        return {**out, "status": "manual_review", "kind": "type_error",
                "message": f"{label}: value '{_fmt(actual)}' could not be compared"}

    if op == "not_expired":
        msg = f"{label}: valid until {_fmt(actual)}" + ("" if ok else f" — expired (checked on {_fmt(today())})")
    elif op in ("exists", "is_true"):
        msg = f"{label}: {'present' if ok else 'not found'}"
    else:
        msg = f"{label}: {_fmt(actual)} (required {OP_TEXT.get(op, op)} {_fmt(expected)})"
    return {**out, "status": "pass" if ok else "fail", "kind": "check", "message": msg}


def infra_norms(rules: list[ComplianceRule], app: Application | None = None) -> list[dict[str, Any]]:
    """Equipment minimums for the CV module, taken from active rules on infra.* facts."""
    norms = []
    for r in rules:
        if not r.is_active or (app is not None and not rule_applies(r, app)):
            continue
        check = (r.conditions or {}).get("check") or {}
        fact = check.get("fact", "")
        if fact.startswith("infra.") and check.get("op") in (">=", ">") and isinstance(check.get("value"), (int, float)):
            minimum = check["value"] + (1 if check["op"] == ">" else 0)
            norms.append({"object": fact.split(".", 1)[1], "min": minimum, "rule_code": r.rule_code,
                          "label": check.get("label") or r.title})
    return norms
