# Validex — AI decision support for AICTE application validation

**SIH 2026 · Problem Statement SIH26261 · Team We Aren't Robots**

Validex pre-screens AICTE approval applications (EoA and other categories). It reads the uploaded documents, checks them against configurable Approval Process Handbook rules and AICTE's own institutional records, looks for signs of tampering and re-used evidence, verifies certificates with their issuing authorities (signed QR codes and registry lookups), and assists with infrastructure evidence using computer vision.

Every result is an **evidence-linked, explainable finding** for an official. The system never approves, rejects or issues notices on its own. Decisions are recorded by an authorised officer, with reasons, in a hash-chained audit ledger.

> All data in this repository is synthetic. The issuing authorities and AICTE records are simulated behind pluggable adapters; the system does not assume access to any restricted database.

---

## What the problem statement asks for, and where it is

| Requirement | Implementation |
|---|---|
| Category-based checklist and configurable rules | `services/rule_engine.py`: rules are data (`requires_doc` + `check {fact, op, value}`), filtered by application category, versioned, edited in the UI by admins with an audited reason. |
| Retrieve records from authorised AICTE systems | `services/records_service.py` via the connector: approved intake, faculty on record, TER payment, previous EoA, open deficiencies. Used by rules and cross-checks. |
| OCR, classification, extraction | Native PDF text (visibility-aware, so text hidden under a whiteout is ignored), EasyOCR with OpenCV preprocessing for scans/photos, keyword classifier with a wrong-slot warning, domain extractors with multi-format dates. |
| Missing / incomplete / expired / inconsistent | Completeness and expiry via rules; fuzzy name matching (RapidFuzz + abbreviation normalisation) across documents, the application and AICTE records; land and faculty cross-checks. |
| Alterations, duplicates, metadata, mismatched identifiers | `ml/forgery_detector.py` (cover-up boxes, overlapping text layers, font/baseline anomalies, revision history, editing-tool metadata; for images: noise consistency, verified copy-move, ELA as a weak signal). `services/duplicate_service.py` (exact hash, perceptual hash across institutions, the same certificate/UDIN number used by different institutions). |
| Verification at the source | `services/verification_service.py`: Ed25519-signed QR codes checked offline (and compared with the printed text), plus registry lookups. Statuses: verified, mismatch, expired, pending, source unavailable, manual review, each with source, identifiers sent, timestamp, field-by-field comparison and reason. Retry with exponential backoff, a circuit breaker and a periodic sweep (Celery beat). |
| Infrastructure assistance | `ml/infrastructure_cv.py`: YOLOv8 on photos and video keyframes, equipment minimums from rules, evidence-quality checks (dark, blurred, low resolution), honest "not detectable / manual review" when it cannot tell. Floor-plan classroom areas are checked by rule. |
| Dashboard, alerts, audit trail | Officials' dashboard (live KPIs, alerts, metrics), per-application findings, split-screen document review with evidence overlays, append-only hash-chained ledger with an integrity check. |
| Institution alerts / rectification | Deficiency notices with plain-language fix instructions per item, a due date, in-app inbox (email if SMTP is set), replace-one-document versioning, resubmission, self-check before submitting. |
| Role-based access, human review | Roles: admin, scrutiny, expert, institution. Object-level access checks on every endpoint. Self-registration creates institutions only. Adverse decisions, and overrides of the AI advice, require written reasons. |
| Security, confidentiality, retention | Salted PBKDF2 passwords, JWT, login rate limit, upload type sniffing and size limit, server-generated storage names, document-view logging, retention purge (dry run by default), security headers, internal-only network in production compose. |

---

## Architecture

```
React (Vite + Tailwind) ── institution portal · scrutiny workspace · rules editor · audit ledger
        │ /api (JWT)
FastAPI ── auth/RBAC · applications · documents · validation · verification · rules · audit · notices
   │            │                         │
   │   Celery workers (Redis)        Connector adapters ──► simulated issuing authorities (separate service)
   │   heavy: OCR, forensics, YOLO        (in-process or HTTP)  └► simulated AICTE institutional records
   │   light: source checks, email
   │   beat : retry sweep
PostgreSQL / SQLite (data + hash-chained audit) · MinIO / local vault (files + evidence images)
```

Processing pipeline per document, with a live progress bar in the UI:
`OCR → classify → extract fields → locate fields → forensics → duplicates → QR + registry verification` (lab photos and videos go to the CV stage).

---

## Quick start (local, no Docker)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Linux/macOS: source .venv/bin/activate
pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision
pip install -r requirements.txt
python ../scripts/generate_demo_data.py --reset    # synthetic documents + 3 seeded applications
uvicorn app.main:app --port 8000
```

```bash
cd frontend
npm install
npm run dev                         # http://localhost:3000 (proxies /api to :8000)
```

* API docs (for portal integration): http://localhost:8000/docs
* The first run downloads YOLOv8n and the EasyOCR models into `backend/ml_models/`.
* Uploads are processed as FastAPI background tasks locally; set `USE_CELERY=true` with Redis for workers.
* Put 2+ **real computer-lab photos** in `sample_docs/lab_photos/` before seeding; otherwise placeholders are used and the lab rule (correctly) asks for better evidence.

### Docker

```bash
docker compose up -d --build                       # dev: web :3000, API :8000, Flower :5555
docker compose exec backend python ../scripts/generate_demo_data.py --reset
```

`docker-compose.prod.yml` keeps every service on an internal network and exposes only Nginx on :80. It requires `SECRET_KEY`, `POSTGRES_PASSWORD` and the MinIO credentials; see `.env.production.example`. Pre-load the `models` volume (YOLO + EasyOCR weights), because the internal network has no internet access.

---

## Demo accounts (synthetic)

| Role | Email | Password |
|---|---|---|
| Scrutiny officer | scrutiny@aicte-india.org | scrutiny123 |
| Admin (rules, users, demo controls) | admin@aicte-india.org | admin123 |
| Expert committee | expert@aicte-india.org | expert123 |
| Apex Institute (clean) | principal@apex.edu.in | apex123 |
| Zenith College (problems) | principal@zenith.edu.in | zenith123 |
| Crescent Institute | principal@crescent.edu.in | crescent123 |

Demo accounts are seeded only when `ENVIRONMENT` is not `production`.

## 5-minute demo script

1. **Scrutiny officer → Dashboard.** Live counts, critical alerts first.
2. **Zenith (risk 100).** The AI advises "deficiency suspected" and explains why ("Why this score?"). Then go through the findings:
   * the Fire NOC date was altered: a white box hides `15/03/2025` and `31/12/2027` is typed on top in another font;
   * the issuer-signed QR still says 2025-03-15, and the fire department's registry agrees;
   * the audit report reuses Apex's UDIN;
   * the university NOC expired;
   * faculty 9 vs 15 required;
   * the land deed is missing;
   * the lab photo is a copy of Crescent's;
   * TER fee unpaid and an open deficiency on AICTE records.
3. **Document review.** The red box sits on the altered date, and the field-by-field comparison sits next to the page. Use ←/→ to move between documents.
4. **Admin → Rules Engine.** Change a threshold (e.g. land ≥ 2.5 → 15 acres) with a reason, re-run screening, and the finding changes. History shows v1 → v2.
5. **Admin → Administration → Simulate outage**, then re-verify a document: "source unavailable, retry scheduled". Restore and re-verify: it verifies.
6. **Officer → Issue deficiency notice** (pick items, 7 days). Then sign in as **Zenith**: the notice is in the inbox with "what to do" per item. Replace one document and resubmit.
7. **Officer → Record decision.** Approving against the AI advice requires a reason. **Audit Ledger → Verify chain integrity** confirms the chain is intact.

---

## Evaluation and tests

```bash
cd backend
python -m pytest -q                  # 34 tests: access control, workflow, forensics, QR, statuses, rules, audit chain
python ../scripts/evaluate.py        # writes EVALUATION.md (add --quick to skip scanned-document OCR)
```

Latest results on the labelled synthetic set are in [EVALUATION.md](EVALUATION.md):
* PDF tampering: 20/20 detected, 0 false positives on 20 clean PDFs.
* Scans: 0 false positives, but recall 0.35. Digital pastes on noisy scans are caught; low-noise pastes and low-quality splices are not.
* Digital-PDF field extraction: 100%. Scanned OCR reads dates well but misreads separators in IDs, so OCR-read identifiers never produce an automatic "mismatch".
* Duplicate photos: 15/15 detected, 0 false matches.
* Verification statuses: 14/14 correct.

These are synthetic-set numbers, not real-world accuracy claims.

## Integrating with the AICTE portal

* REST API with OpenAPI at `/docs`. The portal can create applications, upload documents (async; poll `/api/documents/{id}/status`), fetch `/api/validation/report/{id}` (evidence-linked JSON) and `/api/compliance/check/{id}`.
* Issuing authorities and AICTE records are reached only through `services/connectors.py`. Replace the simulated adapter with DigiLocker / API Setu / ICAI / state-portal connectors without touching validation logic. Only the identifier being verified is sent out.
* Signed QR format: `VALIDEX1:` + base64(JSON `{iss, data, sig}`), Ed25519 over `{iss, data}`. Issuers publish their public key (`/mock-authority/{issuer}/public-key`).

## Safeguards built in

* AI output is advisory. The AI never sets a final status; screening only moves `submitted → under_review`.
* Adverse decisions, and decisions that differ from the AI advice, need a written reason. Experts cannot approve or reject.
* Forgery findings are worded as "possible alteration — needs verification" and carry their evidence.
* Rules are data, versioned and audited; findings record the rule code and version applied.
* Every upload, check, source response, rule change, notice, document view and decision is in the hash-chained ledger (`/api/audit/verify-chain`).

## Known limits and next steps

* Pixel forensics on heavily compressed, low-noise scans is weak; QR and registry verification is the stronger control.
* YOLOv8n uses COCO classes (monitors appear as "tv"). A model fine-tuned on lab equipment would improve counts; fire extinguishers and projectors are currently "manual check".
* Room dimensions from photos are not estimated; classroom areas come from the sanctioned plan.
* Not implemented from the stretch list: presigned multipart uploads, page streaming, WebSocket progress (the UI polls), Postgres row-level security, regional-language UI.

## Project layout

```
backend/app/api/            REST endpoints (auth, applications, documents, validation, verification, compliance, audit, notifications, admin)
backend/app/services/       pipeline, rule engine, validation, verification, connectors, matching, duplicates, notifications, retention, audit
backend/app/ml/             OCR, extraction, forensics, QR verification, perceptual hash, infrastructure CV
backend/app/mock_authority/ simulated issuing authorities + AICTE records (registry.json), issuer keys
backend/tests/              pytest suite
scripts/                    synthetic document factory, demo seeding, evaluation
frontend/src/               React app (pages, DocumentReview, UploadSlots, ui kit)
```
