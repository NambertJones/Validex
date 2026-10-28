"""End-to-end: institution drafts and submits, AI pre-screens, official decides, rectification loop."""

import pytest


def _submit_set(client, headers, spec, skip=()):
    app = client.post("/api/applications", json={"category": "eoa", "permanent_id": spec["permanent_id"],
                                                 "requested_intake": spec["intake"]}, headers=headers).json()
    for doc_type, name, data in spec["docs"]:
        if doc_type in skip:
            continue
        mime = "application/pdf" if name.endswith(".pdf") else "image/jpeg"
        res = client.post("/api/documents/upload", data={"application_id": app["id"], "doc_type": doc_type},
                          files={"file": (name, data, mime)}, headers=headers)
        assert res.status_code == 201, res.text
        assert res.json()["processing_stage"] == "done"
    res = client.post(f"/api/applications/{app['id']}/submit", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


@pytest.fixture(scope="module")
def apex_app(client, demo_sets):
    from conftest import login
    return _submit_set(client, login(client, "principal@apex.edu.in", "apex123"), demo_sets["apex"])


@pytest.fixture(scope="module")
def zenith_app(client, demo_sets, apex_app):
    from conftest import login
    return _submit_set(client, login(client, "principal@zenith.edu.in", "zenith123"), demo_sets["zenith"])


def test_clean_application_has_no_critical_findings(client, apex_app, officer):
    assert apex_app["status"] == "under_review"  # AI never approves; it only moves to review
    report = client.get(f"/api/validation/report/{apex_app['id']}", headers=officer).json()
    assert report["summary"]["critical_flags"] == 0, [f["finding"] for f in report["findings"]]
    assert "decision-support" in report["disclaimer"]
    detail = client.get(f"/api/applications/{apex_app['id']}", headers=officer).json()
    fire = next(d for d in detail["documents"] if d["doc_type"] == "fire_safety")
    statuses = {v["method"]: v["status"] for v in client.get(f"/api/verification/status/{fire['id']}", headers=officer).json()}
    assert statuses == {"digital_signature": "verified", "api": "verified"}


def test_problem_application_findings_are_evidence_linked(client, zenith_app, officer):
    assert zenith_app["ai_recommendation"] == "deficiency_suspected"
    findings = client.get(f"/api/validation/report/{zenith_app['id']}", headers=officer).json()["findings"]
    text = " | ".join(f["finding"] for f in findings)
    assert "Possible alteration in fire_noc_renewed.pdf" in text
    assert "Same udin submitted by another institution" in text
    assert "Required document not submitted: land document" in text
    assert "TER payment status: unpaid" in text
    assert "expired" in text.lower()
    forgery = next(f for f in findings if f["check_type"] == "forgery")
    assert forgery["details"]["boxes"], "tamper finding must point at a region"
    assert "31/12/2027" in forgery["evidence"] and "15/03/2025" in forgery["evidence"]
    qr = next(f for f in findings if "signed QR" in f["finding"] and "fire_noc" in f["finding"])
    assert qr["severity"] == "critical" and "altered" in qr["evidence"]
    assert all(f["fix_hint"] for f in findings if f["severity"] == "critical")


def test_adverse_decision_requires_reason(client, zenith_app, officer):
    res = client.post(f"/api/applications/{zenith_app['id']}/decision", json={"status": "rejected"}, headers=officer)
    assert res.status_code == 422
    res = client.post(f"/api/applications/{zenith_app['id']}/decision",
                      json={"status": "approved", "verdict_notes": "ok"}, headers=officer)
    assert res.status_code == 422  # overriding a deficiency recommendation needs a real justification


def test_deficiency_notice_and_rectification(client, zenith_app, officer, zenith, demo_sets):
    res = client.post(f"/api/applications/{zenith_app['id']}/deficiency-notice",
                      json={"notes": "Please rectify the listed items", "due_days": 7}, headers=officer)
    assert res.status_code == 201, res.text
    notice = res.json()
    assert notice["items"] and all(i["fix_hint"] for i in notice["items"])
    inbox = client.get("/api/notifications", headers=zenith).json()
    assert inbox[0]["id"] == notice["id"]
    assert client.post(f"/api/notifications/{notice['id']}/acknowledge", headers=zenith).json()["status"] == "acknowledged"

    # Replace the expired NOC with a valid one -> new version, old kept
    detail = client.get(f"/api/applications/{zenith_app['id']}", headers=zenith).json()
    noc = next(d for d in detail["documents"] if d["doc_type"] == "noc" and d["is_current"])
    _, name, data = next(d for d in demo_sets["crescent"]["docs"] if d[0] == "noc")
    res = client.post(f"/api/documents/{noc['id']}/replace", files={"file": (name, data, "application/pdf")}, headers=zenith)
    assert res.status_code == 201
    versions = client.get(f"/api/documents/{res.json()['id']}", headers=zenith).json()["versions"]
    assert len(versions) == 2 and sum(v["is_current"] for v in versions) == 1
    assert client.post(f"/api/applications/{zenith_app['id']}/submit", headers=zenith).status_code == 200


def test_decision_recorded_in_audit_chain(client, apex_app, officer):
    res = client.post(f"/api/applications/{apex_app['id']}/decision",
                      json={"status": "approved", "verdict_notes": "Verified physically during EVC visit; lab photos confirmed"},
                      headers=officer)
    assert res.status_code == 200, res.text
    trail = client.get(f"/api/audit/{apex_app['id']}", headers=officer).json()
    decision = next(e for e in trail if e["action"] == "APPLICATION_DECISION")
    assert decision["actor"] == "Regional Scrutiny Officer" and decision["entry_hash"]
    assert client.get("/api/audit/verify-chain", headers=officer).json()["valid"] is True


def test_dashboard_and_metrics(client, zenith_app, officer):
    stats = client.get("/api/dashboard/stats", headers=officer).json()
    assert stats["tamper_suspected_count"] >= 1 and stats["duplicate_flags"] >= 1
    metrics = client.get("/api/dashboard/metrics", headers=officer).json()
    assert metrics["verification"]["total_checks"] > 0
