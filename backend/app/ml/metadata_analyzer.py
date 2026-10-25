"""PDF metadata and structural forensics analyzer."""

import io
import re
from datetime import datetime
from typing import Any
import fitz  # PyMuPDF


class MetadataAnalyzer:
    """Detects suspicious metadata traces, editing software footprints, and PDF structural tampering."""

    SUSPICIOUS_SOFTWARE = [
        "photoshop", "gimp", "canva", "sejda", "pdfescape",
        "ilovepdf", "smallpdf", "nitro", "foxit phantom", "inkscape",
        "illustrator", "coreldraw",
    ]

    def analyze_pdf(self, pdf_bytes: bytes) -> dict[str, Any]:
        report = {
            "is_suspicious": False,
            "risk_score": 0.0,
            "findings": [],
            "metadata": {},
            "structural_anomalies": [],
        }

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            meta = doc.metadata or {}
            report["metadata"] = {
                "format": meta.get("format", ""),
                "title": meta.get("title", ""),
                "author": meta.get("author", ""),
                "creator": meta.get("creator", ""),
                "producer": meta.get("producer", ""),
                "creationDate": meta.get("creationDate", ""),
                "modDate": meta.get("modDate", ""),
            }

            creator_lower = (meta.get("creator") or "").lower()
            producer_lower = (meta.get("producer") or "").lower()

            # 1. Check for suspicious editing software
            for tool in self.SUSPICIOUS_SOFTWARE:
                if tool in creator_lower or tool in producer_lower:
                    report["is_suspicious"] = True
                    report["risk_score"] += 35.0
                    report["findings"].append(
                        f"Document was generated or edited using image editing / online PDF tool: '{tool.title()}'"
                    )

            # 2. Check CreationDate vs ModDate discrepancy
            c_date_raw = meta.get("creationDate", "")
            m_date_raw = meta.get("modDate", "")
            if c_date_raw and m_date_raw:
                c_clean = re.sub(r"[^0-9]", "", c_date_raw)[:8]
                m_clean = re.sub(r"[^0-9]", "", m_date_raw)[:8]
                if c_clean and m_clean and len(c_clean) >= 4 and len(m_clean) >= 4:
                    c_year = int(c_clean[:4])
                    m_year = int(m_clean[:4])
                    if abs(m_year - c_year) >= 1:
                        report["is_suspicious"] = True
                        report["risk_score"] += 25.0
                        report["findings"].append(
                            f"Significant modification lag: Created in {c_year} but modified in {m_year}"
                        )

            # 3. Check for multiple incremental revisions / updates
            if doc.is_repaired:
                report["structural_anomalies"].append("PDF cross-reference table was corrupted or repaired")

            # Check for hidden layers / Optional Content Groups (OCGs)
            if hasattr(doc, "has_annots") and doc.has_annots():
                report["structural_anomalies"].append("Document contains interactive annotations or overlay forms")

        except Exception as e:
            report["findings"].append(f"Metadata parsing note: {str(e)}")

        report["risk_score"] = min(report["risk_score"], 100.0)
        return report


metadata_analyzer = MetadataAnalyzer()
