"""Infrastructure and computer vision inspection endpoints."""

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.application import Application
from app.models.document import Document, DocumentType, DocumentStatus
from app.models.validation_result import ValidationResult, CheckType, Severity
from app.ml.infrastructure_cv import infrastructure_cv
from app.services.audit_service import audit_service

router = APIRouter(prefix="/infrastructure", tags=["Infrastructure Computer Vision"])


@router.post("/analyze")
async def analyze_infrastructure_photo(
    application_id: Annotated[uuid.UUID, Form()],
    file: Annotated[UploadFile, File()],
    lab_name: Annotated[str, Form()] = "Computer Systems & Networking Laboratory",
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Session = Depends(get_db),
):
    """Run YOLOv8 object detection on uploaded lab / campus photographs:
    Counts terminals, fire safety extinguishers, student seating, and assesses compliance.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Photo file is empty")

    report = infrastructure_cv.analyze_photo(file_bytes)

    # Save validation result
    deficient_items = [f for f in report.compliance_flags if f["status"] == "deficient"]
    sev = Severity.CRITICAL if deficient_items else Severity.INFO
    finding_text = (
        f"Lab photo analysis for '{lab_name}': {len(deficient_items)} equipment deficiencies identified"
        if deficient_items
        else f"Lab photo analysis for '{lab_name}': Physical infrastructure fully compliant with AICTE norms"
    )

    val_res = ValidationResult(
        application_id=application_id,
        document_id=None,
        check_type=CheckType.INFRASTRUCTURE,
        severity=sev,
        finding=finding_text,
        evidence=f"Detected equipment: {report.equipment_counts}",
        details=report.to_dict(),
        confidence=0.88,
    )
    db.add(val_res)
    db.commit()

    if current_user:
        audit_service.log_event(
            db=db,
            action="INFRASTRUCTURE_CV_ANALYZED",
            user_id=current_user.id,
            application_id=application_id,
            details={"lab_name": lab_name, "counts": report.equipment_counts},
        )

    return report.to_dict()
