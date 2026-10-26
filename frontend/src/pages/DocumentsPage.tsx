import React, { useState } from 'react';
import { Upload, FileText, ShieldAlert, Sparkles } from 'lucide-react';
import { documentsApi, applicationsApi } from '../api/client';
import type { DocumentType } from '../types';

export const DocumentsPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>('fire_safety');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Find an application or create a transient one for testing
      const apps = await applicationsApi.list();
      let targetAppId = apps[0]?.id;
      if (!targetAppId) {
        const newApp = await applicationsApi.create({
          category: 'eoa',
          academic_year: '2025-2026',
          institution_name: 'Document Analysis Sandbox',
        });
        targetAppId = newApp.id;
      }

      const fd = new FormData();
      fd.append('application_id', targetAppId);
      fd.append('file', selectedFile);
      fd.append('doc_type', docType);

      const doc = await documentsApi.upload(fd);
      const ext = await documentsApi.getExtractedData(doc.id);

      setAnalysisResult({
        document: doc,
        extracted: ext,
      });
    } catch (err) {
      console.error('Inspection failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Forensics & OCR Lab</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload any institutional document PDF or scan to run instant OCR extraction, layout parsing, and Error Level Analysis (ELA) tampering detection.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Box */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            Upload Document Scan
          </h2>

          <form onSubmit={handleInspect} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 cursor-pointer"
              >
                <option value="fire_safety">Fire Safety Certificate</option>
                <option value="audit_report">Audited Balance Sheet</option>
                <option value="land_document">Land Title Deed</option>
                <option value="faculty_list">Approved Faculty List</option>
                <option value="affidavit">Statutory Affidavit</option>
                <option value="building_plan">Sanctioned Building Plan</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/70">
              <input
                type="file"
                id="doc-upload-input"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="doc-upload-input" className="cursor-pointer block">
                <FileText className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-800 block">
                  {selectedFile ? selectedFile.name : 'Click to select file'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">PDF, PNG, or JPEG up to 25MB</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!selectedFile || analyzing}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
            >
              {analyzing ? 'Processing Forensics...' : 'Run Extraction & Tamper Analysis'}
            </button>
          </form>
        </div>

        {/* Results Showcase */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            Inspection & Forensics Output
          </h2>

          {!analysisResult ? (
            <div className="py-24 text-center text-slate-400 text-xs font-medium">
              Upload a document on the left to view extracted metadata fields, OCR confidence, and compression heatmap.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top status bar */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                    {analysisResult.document.doc_type}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {analysisResult.document.original_filename}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">Forgery Score</span>
                  <span
                    className={`text-lg font-mono font-bold ${
                      analysisResult.extracted.forgery_score > 30 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {analysisResult.extracted.forgery_score}%
                  </span>
                </div>
              </div>

              {/* Extracted Key-Values */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  OCR-Extracted Key Attributes
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {Object.entries(analysisResult.extracted.extracted_data || {}).map(([k, v]) => {
                    if (typeof v === 'object' || k === 'raw_text_snippet' || k === 'forgery_heatmap_preview')
                      return null;
                    return (
                      <div key={k} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 font-medium capitalize">{k.replace('_', ' ')}</span>
                        <p className="font-mono text-slate-800 font-semibold mt-0.5 truncate">{String(v)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Heatmap preview if present */}
              {analysisResult.extracted.heatmap_available && (
                <div>
                  <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Error Level Analysis (ELA) Splicing Heatmap
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-rose-300 max-h-80 bg-slate-950 flex items-center justify-center">
                    <img
                      src={analysisResult.extracted.extracted_data.forgery_heatmap_preview}
                      alt="Tamper Heatmap"
                      className="object-contain max-h-72 w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
