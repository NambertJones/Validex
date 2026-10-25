"""Structured field extraction engine using regular expressions, entities, and pattern matchers."""

import re
from typing import Any
from app.models.document import DocumentType


class DataExtractor:
    """Extracts domain-specific structured metadata from OCR text."""

    def extract_fields(self, text: str, doc_type: DocumentType) -> dict[str, Any]:
        extracted: dict[str, Any] = {}

        if doc_type == DocumentType.FIRE_SAFETY:
            extracted.update(self._extract_fire_safety(text))
        elif doc_type == DocumentType.AUDIT_REPORT:
            extracted.update(self._extract_audit_report(text))
        elif doc_type == DocumentType.LAND_DOCUMENT:
            extracted.update(self._extract_land_document(text))
        elif doc_type == DocumentType.FACULTY_LIST:
            extracted.update(self._extract_faculty_list(text))
        elif doc_type == DocumentType.AFFIDAVIT:
            extracted.update(self._extract_affidavit(text))
        elif doc_type == DocumentType.BUILDING_PLAN:
            extracted.update(self._extract_building_plan(text))
        elif doc_type == DocumentType.NOC:
            extracted.update(self._extract_noc(text))

        # Common extraction across all docs
        extracted.update(self._extract_common(text))
        return extracted

    def _extract_common(self, text: str) -> dict[str, Any]:
        common = {}
        # Dates (DD/MM/YYYY or DD-MM-YYYY)
        dates = re.findall(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b", text)
        if dates:
            common["detected_dates"] = dates[:5]

        # Pin codes
        pincodes = re.findall(r"\b([1-9][0-9]{5})\b", text)
        if pincodes:
            common["pincodes"] = list(set(pincodes))

        return common

    def _extract_fire_safety(self, text: str) -> dict[str, Any]:
        data = {}
        # Certificate Number
        cert_match = re.search(
            r"(?:Certificate|NOC|Ref|Licence)\s*(?:No|Number|#)[:\s.]*([A-Za-z0-9/\-_]+)",
            text,
            re.IGNORECASE,
        )
        if cert_match:
            data["certificate_number"] = cert_match.group(1).strip()

        # Valid until
        valid_match = re.search(
            r"(?:Valid\s*(?:Up\s*to|Until|thru|through)|Expiry\s*Date)[:\s.]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
            text,
            re.IGNORECASE,
        )
        if valid_match:
            data["valid_until"] = valid_match.group(1).strip()

        # Issue date
        issue_match = re.search(
            r"(?:Date\s*of\s*Issue|Issued\s*on|Date)[:\s.]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
            text,
            re.IGNORECASE,
        )
        if issue_match:
            data["issue_date"] = issue_match.group(1).strip()

        # Issuing Authority
        auth_match = re.search(
            r"(?:Issued\s*by|Office\s*of\s*the|Authority)[:\s.]*([^\n\r,]+(?:Fire|Services|Department|Officer)[^\n\r]*)",
            text,
            re.IGNORECASE,
        )
        if auth_match:
            data["issuing_authority"] = auth_match.group(1).strip()
        else:
            data["issuing_authority"] = "State Fire & Emergency Services"

        return data

    def _extract_audit_report(self, text: str) -> dict[str, Any]:
        data = {}
        # Financial Year
        fy_match = re.search(
            r"(?:Financial\s*Year|F\.?Y\.?)[:\s.]*(\d{4}[-–]\d{2,4})",
            text,
            re.IGNORECASE,
        )
        if fy_match:
            data["financial_year"] = fy_match.group(1).strip()

        # UDIN (Unique Document Identification Number - 18 digits)
        udin_match = re.search(r"\b(\d{2}[A-Za-z0-9]{16})\b", text)
        if udin_match:
            data["udin"] = udin_match.group(1)

        # CA Membership Number
        ca_mem_match = re.search(
            r"(?:Membership\s*(?:No|Number)|M\.?No)[:\s.]*(\d{5,8})",
            text,
            re.IGNORECASE,
        )
        if ca_mem_match:
            data["ca_membership_no"] = ca_mem_match.group(1)

        # Total Income / Receipts
        income_match = re.search(
            r"(?:Total\s*(?:Income|Receipts|Revenue)|Gross\s*Income)[:\s₹Rs.]*([\d,]+(?:\.\d{2})?)",
            text,
            re.IGNORECASE,
        )
        if income_match:
            data["total_income"] = income_match.group(1).replace(",", "")

        # Total Expenditure
        exp_match = re.search(
            r"(?:Total\s*(?:Expenditure|Expenses)|Gross\s*Expenses)[:\s₹Rs.]*([\d,]+(?:\.\d{2})?)",
            text,
            re.IGNORECASE,
        )
        if exp_match:
            data["total_expenditure"] = exp_match.group(1).replace(",", "")

        return data

    def _extract_land_document(self, text: str) -> dict[str, Any]:
        data = {}
        # Land Area (acres / hectares / sq meters)
        area_match = re.search(
            r"(\d+(?:\.\d+)?)\s*(?:Acres|Hectares|Sq\.\s*Meters|Square\s*Meters)",
            text,
            re.IGNORECASE,
        )
        if area_match:
            data["land_area"] = area_match.group(0)

        # Survey / Khasra Numbers
        survey_match = re.search(
            r"(?:Survey\s*No|Khasra\s*No|Khatauni)[:\s.]*([A-Za-z0-9,/\-\s]+)",
            text,
            re.IGNORECASE,
        )
        if survey_match:
            data["survey_numbers"] = survey_match.group(1).strip()

        # Deed Registration Number
        deed_match = re.search(
            r"(?:Document|Deed|Registration)\s*(?:No|Number)[:\s.]*([A-Za-z0-9/\-_]+)",
            text,
            re.IGNORECASE,
        )
        if deed_match:
            data["deed_number"] = deed_match.group(1).strip()

        return data

    def _extract_faculty_list(self, text: str) -> dict[str, Any]:
        data = {}
        # Count occurrences of academic designations
        professors = len(re.findall(r"\bProfessor\b", text, re.IGNORECASE))
        assoc_profs = len(re.findall(r"\bAssociate\s+Professor\b", text, re.IGNORECASE))
        asst_profs = len(re.findall(r"\bAssistant\s+Professor\b", text, re.IGNORECASE))
        phds = len(re.findall(r"\bPh\.?D\b", text, re.IGNORECASE))

        data["professors_count"] = max(professors - assoc_profs - asst_profs, 0)
        data["associate_professors_count"] = assoc_profs
        data["assistant_professors_count"] = asst_profs
        data["total_faculty_detected"] = professors + asst_profs
        data["phd_qualified_count"] = phds

        return data

    def _extract_affidavit(self, text: str) -> dict[str, Any]:
        data = {}
        stamp_match = re.search(
            r"(?:Certificate\s*No|Stamp\s*No|GRN)[:\s.]*([A-Za-z0-9/\-_]+)",
            text,
            re.IGNORECASE,
        )
        if stamp_match:
            data["stamp_certificate_no"] = stamp_match.group(1).strip()

        notary_match = re.search(
            r"(?:Notary\s*Public|Advocate\s*&\s*Notary)[:\s.]*([^\n\r,]+)",
            text,
            re.IGNORECASE,
        )
        if notary_match:
            data["notary_name"] = notary_match.group(1).strip()

        return data

    def _extract_building_plan(self, text: str) -> dict[str, Any]:
        data = {}
        area_match = re.search(
            r"(?:Built[- ]?up\s*Area|Carpet\s*Area|Total\s*Area)[:\s.]*([\d,]+(?:\.\d+)?)\s*(?:Sq\.?\s*M(?:trs|eters)?)",
            text,
            re.IGNORECASE,
        )
        if area_match:
            data["built_up_area_sqm"] = area_match.group(1).replace(",", "")

        approver_match = re.search(
            r"(?:Approved\s*by|Sanctioned\s*by)[:\s.]*([^\n\r,]+)",
            text,
            re.IGNORECASE,
        )
        if approver_match:
            data["sanctioning_authority"] = approver_match.group(1).strip()

        return data

    def _extract_noc(self, text: str) -> dict[str, Any]:
        data = {}
        noc_num = re.search(
            r"(?:NOC\s*No|Letter\s*No|Ref\s*No)[:\s.]*([A-Za-z0-9/\-_]+)",
            text,
            re.IGNORECASE,
        )
        if noc_num:
            data["noc_number"] = noc_num.group(1).strip()

        return data


data_extractor = DataExtractor()
