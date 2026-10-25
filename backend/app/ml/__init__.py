"""ML and AI processing engines for AICTE validation platform."""

from app.ml.ocr_engine import ocr_engine, OCRResult
from app.ml.document_classifier import classifier
from app.ml.data_extractor import data_extractor
from app.ml.forgery_detector import forgery_detector, ForgeryReport
from app.ml.metadata_analyzer import metadata_analyzer
from app.ml.infrastructure_cv import infrastructure_cv, InfrastructureReport

__all__ = [
    "ocr_engine",
    "OCRResult",
    "classifier",
    "data_extractor",
    "forgery_detector",
    "ForgeryReport",
    "metadata_analyzer",
    "infrastructure_cv",
    "InfrastructureReport",
]
