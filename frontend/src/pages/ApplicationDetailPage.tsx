import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  FileText,
  FileCheck2,
  Eye,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import {
  applicationsApi,
  documentsApi,
  validationApi,
  verificationApi,
  complianceApi,
  auditApi,
} from '../api/client';
import type {
  Application,
  ValidationReport,
  ComplianceEvaluation,
  DocumentType,
} from '../types';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [compliance, setCompliance] = useState<ComplianceEvaluation | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'validation' | 'documents' | 'compliance' | 'audit'>('validation');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('fire_safety');
  const [uploading, setUploading] = useState(false);

  // Forgery Heatmap Preview Modal
  const [selectedHeatmap, setSelectedHeatmap] = useState<string | null>(null);

  const loadAll = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const appData = await applicationsApi.get(id);
      setApp(appData);

      const [repData, compData, logData] = await Promise.all([
        validationApi.getReport(id).catch(() => null),
        complianceApi.check(id).catch(() => null),
        auditApi.getAppLogs(id).catch(() => []),
      ]);
      setReport(repData);
      setCompliance(compData);
      setAuditLogs(logData);
    } catch (err) {
      console.error('Failed to load application:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const handleRunValidation = async () => {
    if (!id) return;
    setValidating(true);
    try {
      await validationApi.trigger(id);
      await loadAll();
    } catch (err) {
      console.error('Validation run failed:', err);
    } finally {
      setValidating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;
    try {
      await applicationsApi.updateStatus(id, newStatus, `Official action updated status to ${newStatus}`);
      await loadAll();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !uploadFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('application_id', id);
      fd.append('file', uploadFile);
      fd.append('doc_type', uploadDocType);
      await documentsApi.upload(fd);
      setShowUploadModal(false);
      setUploadFile(null);
      await loadAll();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleTriggerVerification = async (docId: string) => {
    try {
      await verificationApi.trigger(docId);
      await loadAll();
    } catch (err) {
      console.error('Verification failed:', err);
    }
  };

  if (loading && !app) {
    return <div className="text-center py-20 text-gray-500">Loading application dossier...</div>;
  }

  if (!app) {
    return <div className="text-center py-20 text-rose-500">Application not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top back navigation & quick breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/applications"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications List</span>
        </Link>
        <span className="text-xs font-mono font-medium text-slate-500">AY {app.academic_year}</span>
      </div>

      {/* Main Dossier Header Card */}
      <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-indigo-700 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200">
                {app.application_number}
              </span>
              <span className="text-xs uppercase font-mono font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {app.category.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{app.institution_name}</h1>
            <p className="text-xs text-slate-500">
              Submitted on {new Date(app.submitted_at).toLocaleString()} | Current Status:{' '}
              <span className="capitalize font-semibold text-slate-800">{app.status.replace('_', ' ')}</span>
            </p>
          </div>

          {/* AI Risk Score Pill & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Risk Score Widget */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI Risk Score</p>
                <p
                  className={`text-2xl font-mono font-bold ${
                    app.risk_score >= 60
                      ? 'text-rose-600'
                      : app.risk_score >= 25
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {app.risk_score}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                <ShieldAlert
                  className={`w-6 h-6 ${
                    app.risk_score >= 60
                      ? 'text-rose-600'
                      : app.risk_score >= 25
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                />
              </div>
            </div>

            {/* Run AI Validation Suite */}
            <button
              onClick={handleRunValidation}
              disabled={validating}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${validating ? 'animate-spin' : ''}`} />
              <span>{validating ? 'Running Validation Suite...' : 'Run AI Scrutiny'}</span>
            </button>
          </div>
        </div>

        {/* Official Decision Bar (Human-in-the-Loop Authority) */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Scrutiny Verdict:</span>
            <span className="text-xs font-semibold text-slate-800">
              {app.overall_verdict || 'Awaiting preliminary validation report'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusUpdate('approved')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Grant Approval</span>
            </button>
            <button
              onClick={() => handleStatusUpdate('deficiency_found')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Issue Deficiency Notice</span>
            </button>
            <button
              onClick={() => handleStatusUpdate('under_review')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Request Hearing</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('validation')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'validation'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>AI Validation Findings ({report?.findings?.length ?? 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Document Vault ({app.documents?.length ?? 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'compliance'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AICTE Norms Adherence</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Audit Log ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Validation Report */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          {report?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Critical Flags</span>
                <p className="text-xl font-bold font-mono text-rose-600 mt-1">{report.summary.critical_flags}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Warnings</span>
                <p className="text-xl font-bold font-mono text-amber-600 mt-1">{report.summary.warning_flags}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Checks Passed</span>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-1">{report.summary.clean_checks}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Recommendation</span>
                <p className="text-xs font-bold text-slate-800 mt-1 truncate">{report.summary.status_recommendation}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {!report || report.findings.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl text-center text-slate-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-900">No active deficiencies detected</p>
                <p className="text-xs text-slate-500 mt-1">
                  Run the AI Scrutiny Suite to evaluate submitted documents.
                </p>
              </div>
            ) : (
              report.findings.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.severity === 'critical'
                      ? 'bg-rose-50/70 border-rose-200'
                      : item.severity === 'warning'
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-indigo-50/70 border-indigo-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                            item.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : item.severity === 'warning'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {item.severity} • {item.check_type}
                        </span>
                        <span className="text-xs text-slate-500 font-mono font-medium">
                          Confidence: {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{item.finding}</h3>
                      {item.evidence && (
                        <p className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200 font-mono">
                          {item.evidence}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Document Vault */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              Uploaded certificates, deed scans, and financial statements with OCR extraction results
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {app.documents?.map((doc) => {
              const ext = doc.extracted_data || {};
              const forgeryScore = ext.forgery_score ?? 0;
              const hasHeatmap = !!ext.forgery_heatmap_preview;

              return (
                <div key={doc.id} className="glass-panel p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-indigo-700 border border-slate-200 font-bold">
                          {doc.doc_type.replace('_', ' ')}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1.5 truncate max-w-xs">
                          {doc.original_filename}
                        </h3>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          doc.status === 'flagged'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>

                    {/* Extracted Key-Values Preview */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                      {ext.certificate_number && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Certificate No:</span>
                          <span className="font-mono text-slate-800 font-semibold">{ext.certificate_number}</span>
                        </div>
                      )}
                      {ext.valid_until && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Validity:</span>
                          <span className="font-mono text-emerald-700 font-semibold">{ext.valid_until}</span>
                        </div>
                      )}
                      {ext.udin && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">ICAI UDIN:</span>
                          <span className="font-mono text-indigo-700 font-semibold">{ext.udin}</span>
                        </div>
                      )}
                      {ext.land_area && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Land Area:</span>
                          <span className="font-mono text-slate-800 font-semibold">{ext.land_area}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-slate-200 text-[11px]">
                        <span className="text-slate-500 font-medium">Forgery Risk:</span>
                        <span className={`font-mono font-bold ${forgeryScore > 30 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {forgeryScore}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleTriggerVerification(doc.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                    >
                      Verify with Authority &rarr;
                    </button>

                    {hasHeatmap && (
                      <button
                        onClick={() => setSelectedHeatmap(ext.forgery_heatmap_preview)}
                        className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Tamper Heatmap</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Compliance */}
      {activeTab === 'compliance' && compliance && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">AICTE Handbook Norms Adherence Score</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated against statutory fire, land, faculty cadre, and financial requirements
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-indigo-600">{compliance.compliance_score}%</span>
              <p className="text-[11px] text-slate-500 font-medium">
                {compliance.compliant_count} / {compliance.total_rules_evaluated} Rules Satisfied
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {compliance.results.map((r) => (
              <div
                key={r.rule_code}
                className="p-4 rounded-xl glass-card flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 font-semibold">{r.rule_code}</span>
                    <span className="font-bold text-slate-900">{r.title}</span>
                  </div>
                  <p className="text-slate-600">{r.message}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] shrink-0 ${
                    r.status === 'compliant'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {r.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Log */}
      {activeTab === 'audit' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Immutable Application Audit Trail</h2>
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <span className="font-semibold text-indigo-600">{log.action}</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">{JSON.stringify(log.details)}</p>
                </div>
                <span className="font-mono text-slate-400 text-[10px] font-medium">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-200 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-1">Upload Document to Vault</h2>
            <p className="text-xs text-slate-500 mb-4">
              File will be processed through PaddleOCR and Error Level Forgery Analysis
            </p>

            <form onSubmit={handleDocumentUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Category</label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600"
                >
                  <option value="fire_safety">Fire Safety Certificate</option>
                  <option value="audit_report">Audited Balance Sheet</option>
                  <option value="land_document">Land Title Deed</option>
                  <option value="faculty_list">Approved Faculty List</option>
                  <option value="affidavit">Statutory Affidavit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select PDF or Image</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? 'Analyzing...' : 'Upload & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgery Heatmap Modal */}
      {selectedHeatmap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Error Level Analysis (ELA) Tamper Heatmap
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-intensity hot spots indicate digitally spliced text, altered dates, or pasted stamps
                </p>
              </div>
              <button
                onClick={() => setSelectedHeatmap(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[500px]">
              <img src={selectedHeatmap} alt="Forgery Heatmap" className="object-contain max-h-[480px] w-full" />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedHeatmap(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Close Forensics Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
