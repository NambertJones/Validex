"""Generate synthetic demo applications and clean/tampered PDF documents for testing."""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

import fitz  # PyMuPDF
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.application import Application, ApplicationCategory, ApplicationStatus
from app.models.document import Document, DocumentType, DocumentStatus
from app.models.compliance_rule import ComplianceRule
from app.services.compliance_service import compliance_service
from app.services.document_service import document_service
from app.services.validation_service import validation_service


def create_sample_pdf(filepath: str, title: str, lines: list[str]):
    """Create a realistic clean or tampered sample PDF."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4

    # Header border
    rect = fitz.Rect(30, 30, 565, 812)
    page.draw_rect(rect, color=(0.2, 0.2, 0.5), width=2)

    # Title
    page.insert_text((50, 70), title, fontsize=16, fontname="helv", color=(0.1, 0.1, 0.6))
    page.draw_line(fitz.Point(50, 80), fitz.Point(545, 80), color=(0.8, 0.3, 0.1), width=1.5)

    y = 110
    for line in lines:
        if line.startswith("## "):
            y += 10
            page.insert_text((50, y), line[3:], fontsize=12, fontname="helv", color=(0.2, 0.2, 0.2))
            y += 20
        else:
            page.insert_text((50, y), line, fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))
            y += 18

    # Footer
    page.draw_line(fitz.Point(50, 780), fitz.Point(545, 780), color=(0.5, 0.5, 0.5), width=1)
    page.insert_text((50, 795), "Digitally Authenticated Certificate — AICTE Scrutiny Benchmark", fontsize=8, color=(0.4, 0.4, 0.4))

    doc.save(filepath)
    doc.close()


def generate_all_samples(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)

    # 1. Clean Fire Safety Certificate
    clean_fire = os.path.join(output_dir, "fire_safety_clean.pdf")
    create_sample_pdf(
        clean_fire,
        "GOVERNMENT OF NCT OF DELHI — DIRECTORATE OF FIRE SERVICES",
        [
            "Certificate No: DFS/HQ/2024/NOC-98421",
            "Date of Issue: 10/01/2024",
            "Valid Up to: 31/12/2026",
            "## CERTIFICATE OF FIRE SAFETY COMPLIANCE",
            "Certified that the educational building Apex Institute of Technology & Engineering",
            "located at Knowledge Park III, Greater Noida, Pincode: 201310",
            "comprising Basement, Ground and 4 Upper Floors was inspected by officers of this",
            "Department and found compliant with National Building Code Part IV norms.",
            "Issued by: Chief Fire Officer, Disaster Prevention & Safety Division.",
        ],
    )

    # 2. Tampered Fire Safety Certificate (Altered Date)
    tampered_fire = os.path.join(output_dir, "fire_safety_tampered.pdf")
    create_sample_pdf(
        tampered_fire,
        "GOVERNMENT OF NCT OF DELHI — DIRECTORATE OF FIRE SERVICES",
        [
            "Certificate No: DFS/HQ/2022/NOC-44102",
            "Date of Issue: 12/03/2021",
            "Valid Up to: 15/03/2023",  # EXPIRED!
            "## CERTIFICATE OF FIRE SAFETY COMPLIANCE",
            "Certified that building Apex Institute of Technology was inspected.",
            "Notice: Certificate validity expired on 15/03/2023.",
            "Issued by: Chief Fire Officer.",
        ],
    )

    # 3. Clean Audit Report
    clean_audit = os.path.join(output_dir, "audit_report_clean.pdf")
    create_sample_pdf(
        clean_audit,
        "M/S R. SHARMA & ASSOCIATES — CHARTERED ACCOUNTANTS",
        [
            "INDEPENDENT AUDITOR'S REPORT",
            "Financial Year: 2024-2025",
            "UDIN: 24054321BK89123490",
            "Chartered Accountant Membership No: 054321",
            "## STATEMENT OF INCOME AND EXPENDITURE",
            "To the Governing Body of Apex Institute of Technology & Engineering",
            "Total Income: ₹ 14,85,50,000",
            "Total Expenditure: ₹ 12,40,20,000",
            "Surplus Transferred to General Reserve: ₹ 2,45,30,000",
            "We have audited the accompanying financial statements and confirm true and fair view.",
        ],
    )

    # 4. Clean Land Deed
    clean_land = os.path.join(output_dir, "land_deed_clean.pdf")
    create_sample_pdf(
        clean_land,
        "SUB-REGISTRAR REVENUE DEPARTMENT — LAND TITLE DEED",
        [
            "Deed Number: REG-DEED-2021-98124",
            "Date of Registration: 14/08/2021",
            "## SALE DEED FOR INSTITUTIONAL CAMPUS",
            "This registered sale deed conveys contiguous land area of 5.25 Acres",
            "situated at Survey No: 142/1, 142/2, Khatauni: 88, Plot 12.",
            "Registered in favour of: Apex Educational & Research Foundation Trust.",
            "The land is non-encumbered and free from all mortgages, claims and legal disputes.",
        ],
    )

    # 5. Clean Faculty Cadre List
    clean_faculty = os.path.join(output_dir, "faculty_list_clean.pdf")
    create_sample_pdf(
        clean_faculty,
        "APEX INSTITUTE OF TECHNOLOGY & ENGINEERING — APPROVED FACULTY LIST",
        [
            "Academic Year: 2025-2026",
            "Cadre Ratio Compliance Report (Approved by Governing Body)",
            "## SUMMARY OF TEACHING STAFF",
            "Professor: 8 Full-time Ph.D qualified Faculty",
            "Associate Professor: 16 Full-time Ph.D/M.Tech Faculty",
            "Assistant Professor: 48 Full-time Qualified Teaching Staff",
            "Total Faculty Detected: 72",
            "Student Enrollment: 1440 (Student-to-Faculty Ratio: 1:20)",
        ],
    )

    # 6. Clean Notarized Affidavit
    clean_affidavit = os.path.join(output_dir, "affidavit_clean.pdf")
    create_sample_pdf(
        clean_affidavit,
        "GOVERNMENT OF INDIA — NON-JUDICIAL STAMP PAPER",
        [
            "Stamp Certificate No: IN-UP984210542318",
            "Notary Public: Adv. M. K. Saxena",
            "## STATUTORY AICTE COMPLIANCE AFFIDAVIT",
            "I, Dr. S. K. Ramanathan, Principal & Secretary of Apex Educational Trust,",
            "solemnly affirm and declare on oath that our institution strictly abides by",
            "all AICTE Approval Process Handbook norms, fee structures, and anti-ragging measures.",
            "Verified at Greater Noida on 15/01/2025.",
        ],
    )

    return {
        "clean_fire": clean_fire,
        "tampered_fire": tampered_fire,
        "clean_audit": clean_audit,
        "clean_land": clean_land,
        "clean_faculty": clean_faculty,
        "clean_affidavit": clean_affidavit,
    }


def seed_database():
    """Populate database with sample applications, documents, and run validations."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        compliance_service.seed_default_rules(db)

        # Get or create users
        inst_user = db.query(User).filter(User.email == "principal@apex.edu.in").first()
        if not inst_user:
            inst_user = User(
                email="principal@apex.edu.in",
                hashed_password=hash_password("apex123"),
                full_name="Dr. S. K. Ramanathan",
                role=UserRole.INSTITUTION,
                institution_name="Apex Institute of Technology & Engineering",
            )
            db.add(inst_user)
            db.commit()
            db.refresh(inst_user)

        sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_docs"))
        samples = generate_all_samples(sample_dir)

        # 1. Clean Application (High Compliance, Low Risk)
        app_clean = db.query(Application).filter(Application.application_number == "AICTE-2025-10001").first()
        if not app_clean:
            app_clean = Application(
                application_number="AICTE-2025-10001",
                institution_id=inst_user.id,
                institution_name="Apex Institute of Technology & Engineering",
                category=ApplicationCategory.EOA,
                academic_year="2025-2026",
                status=ApplicationStatus.SUBMITTED,
                risk_score=0.0,
            )
            db.add(app_clean)
            db.commit()
            db.refresh(app_clean)

            # Upload clean docs
            for doc_key in ["clean_fire", "clean_audit", "clean_land", "clean_faculty", "clean_affidavit"]:
                path = samples[doc_key]
                with open(path, "rb") as f:
                    file_bytes = f.read()
                document_service.process_and_save_document(
                    db=db,
                    application_id=app_clean.id,
                    file_bytes=file_bytes,
                    filename=os.path.basename(path),
                    user_id=inst_user.id,
                )

            # Validate clean app
            validation_service.validate_application(db, app_clean.id)

        # 2. Deficient & Tampered Application (High Risk)
        app_tampered = db.query(Application).filter(Application.application_number == "AICTE-2025-88402").first()
        if not app_tampered:
            app_tampered = Application(
                application_number="AICTE-2025-88402",
                institution_id=inst_user.id,
                institution_name="Zenith College of Engineering & Research",
                category=ApplicationCategory.NEW_INSTITUTION,
                academic_year="2025-2026",
                status=ApplicationStatus.SUBMITTED,
                risk_score=0.0,
            )
            db.add(app_tampered)
            db.commit()
            db.refresh(app_tampered)

            # Upload tampered fire cert and missing land doc
            with open(samples["tampered_fire"], "rb") as f:
                document_service.process_and_save_document(
                    db=db,
                    application_id=app_tampered.id,
                    file_bytes=f.read(),
                    filename="fire_safety_tampered.pdf",
                    user_id=inst_user.id,
                    manual_doc_type=DocumentType.FIRE_SAFETY,
                )

            with open(samples["clean_audit"], "rb") as f:
                document_service.process_and_save_document(
                    db=db,
                    application_id=app_tampered.id,
                    file_bytes=f.read(),
                    filename="audit_report_2024.pdf",
                    user_id=inst_user.id,
                    manual_doc_type=DocumentType.AUDIT_REPORT,
                )

            # Validate tampered app
            validation_service.validate_application(db, app_tampered.id)

        print("[SUCCESS] Demo data successfully seeded!")
        print(f"Clean App: AICTE-2025-10001 (Status: {app_clean.status.value}, Risk: {app_clean.risk_score})")
        print(f"Tampered App: AICTE-2025-88402 (Status: {app_tampered.status.value}, Risk: {app_tampered.risk_score})")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
