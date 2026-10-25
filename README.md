# AICTE Smart Document Validation Platform
### SIH Problem Statement ID: 26261 · Team: We Aren't Robots

![AICTE Validation Architecture](https://img.shields.io/badge/AICTE-Approval%20Bureau-4F46E5?style=for-the-badge&logo=shield)
![Status](https://img.shields.io/badge/Status-Hackathon%20Ready-10B981?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React_Vite-20232A?style=for-the-badge&logo=react)
![PyTorch YOLOv8](https://img.shields.io/badge/YOLOv8-Infrastructure%20CV-orange?style=for-the-badge)

---

## 🎯 Executive Overview

The **AICTE Smart Document Validation Platform** is an enterprise-grade AI decision-support system designed to automate the screening, validation, and forensic examination of technical institutional approval applications for the **All India Council for Technical Education (AICTE)**.

It eliminates manual document verification backlogs, detects sophisticated digital forgeries (pasted stamps, altered validity dates, cloned signatures), verifies credentials against authoritative source APIs (DigiLocker, State Fire Authority, ICAI UDIN, MCA), evaluates physical laboratory photos via YOLOv8 computer vision, and generates an evidence-linked audit trail for scrutiny committee officials.

> **Human-in-the-Loop Principle:** The AI acts as an evidentiary copilot and risk screener. Human officials retain full and final decision-making authority.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React + Vite + Tailwind Frontend                │
│  - Scrutiny Dashboard      - Document Vault & ELA Heatmap Viewer       │
│  - Application Dossier     - Compliance Rulebook & Audit Log           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Application Core                        │
│  - JWT & RBAC Engine       - Validation Service                        │
│  - Document Pipeline       - Compliance Rules Engine                   │
│  - Third-Party Connectors  - Audit Logger                              │
└───────────┬───────────────────────┬──────────────────────┬─────────────┘
            │                       │                      │
            ▼                       ▼                      ▼
┌──────────────────────┐  ┌──────────────────┐  ┌────────────────────────┐
│  PostgreSQL Database │  │   Redis & Celery │  │      MinIO Storage     │
│  - Relational Schema │  │   Task Queues    │  │   - Encrypted Document │
│  - Audit Logs        │  │   (OCR, CV, ELA) │  │     Artifact Vault     │
└──────────────────────┘  └─────────┬────────┘  └────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Deep ML / Forensics Engines                       │
│  - PaddleOCR + PyMuPDF: Dual-Engine Text & Table Extraction            │
│  - Error Level Analysis (ELA): JPEG Recompression Splicing Detector    │
│  - ORB/SIFT Matching: Copy-Move Stamp & Signature Cloned Patch Scanner │
│  - PDF Metadata Forensics: Revision & Timestamp Anomaly Analysis       │
│  - YOLOv8: Physical Lab Hardware & Fire Safety Compliance Counter      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Capabilities & The 6 Modules

### 1. Optical Character Recognition (OCR) & Entity Extraction
* Dual-engine processing with **PaddleOCR** and **PyMuPDF**.
* Auto-classification into statutory document types (Fire Safety, Audited Balance Sheet, Land Deed, Faculty List, Affidavit, Building Plan).
* Regex entity extraction for certificate numbers, UDINs, expiry dates, land acreage, and faculty cadre counts.

### 2. Multi-Technique Document Forgery Detection
* **Error Level Analysis (ELA):** Recompresses image at 90% quality and computes pixel delta; detects localized compression anomalies from digitally spliced dates or numbers.
* **Copy-Move Clone Detection:** ORB feature matching detects identical duplicated stamps, seals, or signatures within a document.
* **Noise Inconsistency Analysis:** Laplacian variance across tile grids to detect pasted text blocks from different sources.
* **PDF Structural Forensics:** Scans for creation date vs modification date disparities and image-editing tool footprints (Photoshop, Canva, Sejda).
* **Visual Heatmap Overlay:** Generates color-coded evidence heatmaps displayed directly in the web UI.

### 3. Source Verification Integration
* Simulates and connects to authoritative verification gateways:
  * **DigiLocker:** Verifies Land Title Deeds and Academic Credentials.
  * **State Fire & Emergency Services Portal:** Real-time lookup for Fire Safety Certificates.
  * **ICAI UDIN Portal:** Verifies 18-digit Unique Document Identification Numbers for Audited Financials.
  * **MCA / RoC:** Validates educational trust and society registrations.

### 4. Physical Infrastructure Computer Vision (YOLOv8)
* Deep learning model detects and counts laboratory equipment (computers, workstations, projectors, fire extinguishers, first aid kits).
* Automatically checks compliance against AICTE Approval Process Handbook norms (e.g., minimum 15 workstations per computer lab).

### 5. Configurable Compliance Rulebook
* Centralized norms engine encoding statutory AICTE requirements.
* Validates completeness, expiry dates, and cross-document consistency (e.g., institution name match across all deeds and certificates).

### 6. Audit Trail & Decision Governance
* Immutable chronological event logging for all uploads, AI detections, and official officer actions.
* Transparent confidence scores and evidence snippets linked to every finding.

---

## 🚀 Quickstart Guide

### Option 1: Docker Compose (Full Stack Orchestration)

Ensure Docker Desktop is running, then run:

```bash
# 1. Start all services (PostgreSQL, Redis, MinIO, FastAPI, Celery, Frontend)
docker compose up -d --build

# 2. Seed default demo data and synthetic applications
docker compose exec backend python ../scripts/generate_demo_data.py
```

Access the services:
* **Web Portal:** [http://localhost:3000](http://localhost:3000)
* **Backend API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Celery Flower Dashboard:** [http://localhost:5555](http://localhost:5555)
* **MinIO Console:** [http://localhost:9001](http://localhost:9001)

---

### Option 2: Local Development Setup

#### Backend Setup
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at [http://localhost:3000](http://localhost:3000) with automatic proxying to `http://localhost:8000/api`.

---

## 🔑 Demo Login Credentials

The platform includes pre-configured role profiles with one-click login buttons on the login screen:

| Role | Email | Password | Access Scope |
|------|-------|----------|--------------|
| **AICTE Admin** | `admin@aicte-india.org` | `admin123` | Full administrative control, rule engine editor, system audit log |
| **Scrutiny Officer** | `scrutiny@aicte-india.org` | `scrutiny123` | Scrutiny review, decision granting, deficiency notices, ELA viewer |
| **Institution Principal** | `principal@apex.edu.in` | `apex123` | Application submission, document vault upload, self-healing status |

---

## 🧪 Testing the Prototype

1. **Clean Application Walkthrough:**
   * Log in as Scrutiny Officer.
   * Open `AICTE-2025-10001` (Apex Institute of Technology & Engineering).
   * Note low risk score (0%), verified Fire Safety, valid ICAI UDIN, and approved status.

2. **Tampered Document & Deficiency Detection:**
   * Open `AICTE-2025-88402` (Zenith College of Engineering).
   * Click **Run AI Scrutiny**.
   * The platform flags:
     - 🔴 **Expired Fire Safety Certificate** (expired on 15/03/2023).
     - 🔴 **Missing Mandatory Document** (Land Title Deed not provided).
     - 🔴 **Forgery Flag** with Error Level Analysis (ELA) heatmap viewer.
   * Click **Issue Deficiency Notice** to trigger the automated remediation workflow.

3. **Infrastructure Studio:**
   * Navigate to **Infra CV Studio**.
   * Upload a laboratory photograph.
   * YOLOv8 identifies and tallies computer terminals, fire extinguishers, and student seating with pass/deficient flags.

---

## 🛡️ License

Built for Smart India Hackathon 2024. All rights reserved by Team *We Aren't Robots*.
