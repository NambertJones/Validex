"""Heuristic and keyword-based AICTE document classifier."""

from app.models.document import DocumentType


class DocumentClassifier:
    """Classifies uploaded documents into official AICTE document categories."""

    KEYWORDS = {
        DocumentType.FIRE_SAFETY: [
            "fire safety", "fire fighting", "fire prevention", "noc fire",
            "fire service", "no objection certificate fire", "fire station",
            "fire compliance", "fire extinguisher", "chief fire officer",
        ],
        DocumentType.AUDIT_REPORT: [
            "auditor's report", "chartered accountant", "balance sheet",
            "profit and loss", "income and expenditure", "financial year",
            "statutory auditor", "independent auditor", "udrn", "udin",
        ],
        DocumentType.LAND_DOCUMENT: [
            "sale deed", "gift deed", "lease deed", "land registration",
            "khasra", "khatauni", "survey number", "patta", "revenue department",
            "sub-registrar", "land area", "acres", "acres of land", "built up area",
        ],
        DocumentType.FACULTY_LIST: [
            "faculty details", "teaching staff", "assistant professor",
            "associate professor", "professor & head", "cadre ratio",
            "qualification", "m.tech", "ph.d", "date of joining", "pan number",
        ],
        DocumentType.NOC: [
            "no objection certificate", "affiliating university", "state government noc",
            "directorate of technical education", "dte noc", "board of technical education",
        ],
        DocumentType.AFFIDAVIT: [
            "affidavit", "stamp paper", "non-judicial stamp", "notary public",
            "solemnly affirm", "deponent", "verified at", "before me",
        ],
        DocumentType.BUILDING_PLAN: [
            "building plan", "approved blueprint", "municipal corporation",
            "gram panchayat", "floor area ratio", "carpet area", "architectural drawing",
        ],
        DocumentType.LAB_PHOTO: [
            "laboratory", "computer lab", "workshop", "equipment", "machinery",
        ],
    }

    def classify(self, text: str, original_filename: str = "") -> DocumentType:
        """Classify document by matching keywords against extracted text and filename."""
        text_lower = text.lower()
        filename_lower = original_filename.lower()

        scores: dict[DocumentType, int] = {doc_type: 0 for doc_type in self.KEYWORDS}

        for doc_type, keywords in self.KEYWORDS.items():
            for kw in keywords:
                # Text matches
                if kw in text_lower:
                    scores[doc_type] += 2
                # Filename matches
                if kw in filename_lower or kw.replace(" ", "_") in filename_lower:
                    scores[doc_type] += 3

        best_type, best_score = max(scores.items(), key=lambda x: x[1])
        if best_score >= 2:
            return best_type
        return DocumentType.OTHER


classifier = DocumentClassifier()
