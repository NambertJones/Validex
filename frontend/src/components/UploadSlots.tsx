import React, { useEffect, useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { documentsApi, errorMessage } from '../api/client';
import type { Application, ChecklistItem, DocumentItem, DocumentType } from '../types';
import { DOC_LABELS, Pill, cx } from './ui';

const STAGE_LABEL: Record<string, string> = {
  queued: 'Queued', ocr: 'Reading text (OCR)', classification: 'Classifying', extraction: 'Extracting fields', forensics: 'Checking for alterations',
  computer_vision: 'Counting equipment', duplicates: 'Checking duplicates', source_verification: 'Verifying with issuing authority', done: 'Done',
};

const Slot: React.FC<{ app: Application; item: ChecklistItem; doc?: DocumentItem; editable: boolean; onChanged: () => void }> = ({ app, item, doc, editable, onChanged }) => {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ stage: string; progress: number } | null>(null);
  const [error, setError] = useState('');

  const poll = async (id: string) => {
    for (let i = 0; i < 240; i++) {
      const s = await documentsApi.status(id);
      setProgress({ stage: s.stage, progress: s.progress });
      if (s.progress >= 100 || s.status === 'failed') break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    setProgress(null);
    onChanged();
  };

  useEffect(() => {
    if (doc && (doc.status === 'pending' || doc.status === 'processing')) poll(doc.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  const onFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setProgress({ stage: 'queued', progress: 0 });
    try {
      const created = doc ? await documentsApi.replace(doc.id, file) : await documentsApi.upload(app.id, file, item.doc_type);
      await poll(created.id);
    } catch (e) {
      setError(errorMessage(e));
      setProgress(null);
    }
  };

  const flagged = doc?.status === 'flagged';
  return (
    <div className={cx('p-4 rounded-xl border bg-white', flagged ? 'border-rose-300' : doc ? 'border-emerald-200' : 'border-dashed border-slate-300')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900">{DOC_LABELS[item.doc_type] || item.title}</p>
          <p className="text-[11px] text-slate-500">{item.description}</p>
          {doc && <p className="text-[11px] text-slate-700 mt-1 truncate">{doc.original_filename}</p>}
        </div>
        {doc ? (flagged ? <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />) : <Pill tone="amber">Required</Pill>}
      </div>
      {progress && (
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-slate-600 mb-1"><span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{STAGE_LABEL[progress.stage] || progress.stage}</span><span>{progress.progress}%</span></div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress.progress}%` }} /></div>
        </div>
      )}
      {error && <p className="text-[11px] text-rose-600 mt-2" role="alert">{error}</p>}
      {editable && !progress && (
        <>
          <input ref={input} type="file" className="hidden" accept={item.doc_type === 'lab_photo' ? 'image/jpeg,image/png,video/mp4' : 'application/pdf,image/jpeg,image/png'} onChange={(e) => onFile(e.target.files?.[0])} aria-label={`Upload ${DOC_LABELS[item.doc_type]}`} />
          <button onClick={() => input.current?.click()} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer">
            {doc ? <><RefreshCw className="w-3.5 h-3.5" />Replace with corrected file</> : <><Upload className="w-3.5 h-3.5" />Upload</>}
          </button>
        </>
      )}
    </div>
  );
};

export const UploadSlots: React.FC<{ app: Application; editable: boolean; onChanged: () => void }> = ({ app, editable, onChanged }) => {
  const docs = (app.documents || []).filter((d) => d.is_current);
  const checklist = app.checklist || [];
  const covered = new Set(checklist.map((c) => c.doc_type));
  const extras = docs.filter((d) => !covered.has(d.doc_type as DocumentType));
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {checklist.map((item) => (
          <Slot key={item.rule_code} app={app} item={item} doc={docs.find((d) => d.doc_type === item.doc_type)} editable={editable} onChanged={onChanged} />
        ))}
      </div>
      {extras.length > 0 && <p className="text-[11px] text-slate-500">Other uploads: {extras.map((d) => d.original_filename).join(', ')}</p>}
      {!editable && <p className="text-[11px] text-slate-500">Documents can be changed while the application is a draft or under a deficiency notice.</p>}
    </div>
  );
};
