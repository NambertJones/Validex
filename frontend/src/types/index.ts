export type UserRole = 'admin' | 'scrutiny' | 'expert' | 'institution';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  institution_name?: string;
  is_active: boolean;
}

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'deficiency_found'
  | 'verified'
  | 'approved'
  | 'rejected';

export type ApplicationCategory =
  | 'eoa'
  | 'new_institution'
  | 'change_intake'
  | 'closure'
  | 'other';

export interface Application {
  id: string;
  application_number: string;
  institution_id: string;
  institution_name: string;
  category: ApplicationCategory;
  academic_year: string;
  status: ApplicationStatus;
  risk_score: number;
  overall_verdict?: string;
  submitted_at: string;
  updated_at: string;
  documents?: DocumentItem[];
  validation_results?: ValidationResult[];
  total_documents?: number;
  pending_documents?: number;
  flagged_documents?: number;
}

export type DocumentType =
  | 'fire_safety'
  | 'audit_report'
  | 'land_document'
  | 'faculty_list'
  | 'noc'
  | 'affidavit'
  | 'building_plan'
  | 'lab_photo'
  | 'other';

export type DocumentStatus =
  | 'pending'
  | 'processing'
  | 'validated'
  | 'flagged'
  | 'rejected';

export interface DocumentItem {
  id: string;
  application_id: string;
  doc_type: DocumentType;
  original_filename: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  extracted_data: Record<string, any>;
  page_count: number;
  uploaded_at: string;
  download_url?: string;
}

export type Severity = 'info' | 'warning' | 'critical';
export type CheckType =
  | 'completeness'
  | 'expiry'
  | 'consistency'
  | 'forgery'
  | 'compliance'
  | 'infrastructure';

export interface ValidationResult {
  id: string;
  application_id: string;
  document_id?: string;
  check_type: CheckType;
  severity: Severity;
  finding: string;
  evidence?: string;
  details: Record<string, any>;
  confidence: number;
  created_at: string;
}

export interface ValidationReport {
  application_id: string;
  application_number: string;
  institution_name: string;
  risk_score: number;
  summary: {
    total_checks: number;
    critical_flags: number;
    warning_flags: number;
    info_flags: number;
    clean_checks: number;
    risk_score: number;
    status_recommendation: string;
  };
  findings: ValidationResult[];
  generated_at: string;
}

export interface DashboardStats {
  total_applications: number;
  under_review: number;
  deficiency_found: number;
  verified_approved: number;
  high_risk_flagged: number;
  avg_processing_time_hours: number;
  total_documents_processed: number;
  forgery_detected_count: number;
}

export interface RiskDistributionItem {
  category: string;
  count: number;
  color: string;
}

export interface AlertItem {
  id: string;
  application_id: string;
  application_number: string;
  institution_name: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  user_name: string;
  institution_name: string;
  timestamp: string;
  details: string;
}

export interface ComplianceRule {
  id: string;
  rule_code: string;
  title: string;
  category: string;
  description: string;
  conditions: Record<string, any>;
  is_active: boolean;
}

export interface ComplianceEvaluation {
  application_id: string;
  total_rules_evaluated: number;
  compliant_count: number;
  deficiency_count: number;
  compliance_score: number;
  results: {
    rule_code: string;
    title: string;
    category: string;
    status: 'compliant' | 'non_compliant' | 'warning' | 'not_applicable';
    message: string;
    evidence?: string;
  }[];
}
