import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Gavel, Send, FileWarning, ListChecks, FileSearch, ScrollText, Bell, ShieldCheck, ChevronDown, ChevronUp, Hash } from 'lucide-react';
import { applicationsApi, auditApi, complianceApi, errorMessage, notificationsApi, validationApi } from '../api/client';
import type { Application, AuditEntry, ComplianceEvaluation, NotificationItem, ValidationReport, ValidationResult } from '../types';
import { useAuth } from '../context/AuthContext';
import { AIPill, AI_LABELS, AdvisoryNote, Button, Card, Empty, Modal, Pill, SeverityIcon, SeverityPill, Spinner, StatusPill, cx, fmtDate, fmtDay } from '../components/ui';
import { DocumentReview } from '../components/DocumentReview';
import { UploadSlots } from '../components/UploadSlots';
import { NoticeCard } from './NoticesPage';

type Tab = 'findings' | 'documents' | 'upload' | 'rules' | 'notices' | 'audit';

const FindingRow: React.FC<{ f: ValidationResult; onOpenDoc?: (id: string) => void; selectable?: boolean; selected?: boolean; onToggle?: () => void }> = ({ f, onOpenDoc, selectable, selected, onToggle }) => {
  const [open, setOpen] = useState(false);
  const rows = f.details?.field_comparison as any[] | undefined;
  return (
    <div className={cx('p-4 rounded-xl border bg-white', f.severity === 'critical' ? 'border-rose-200' : f.severity === 'warning' ? 'border-amber-200' : 'border-slate-200')}>
      <div className="flex items-start gap-3">
        {selectable && <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1" aria-label="Include in notice" />}
        <SeverityIcon severity={f.severity} className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{f.finding}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <SeverityPill severity={f.severity} />
            <Pill>{f.check_type}</Pill>
            {f.rule_code && <Pill tone="indigo" title="Rule and version applied">{f.rule_code} v{f.rule_version}</Pill>}
            <span className="text-[11px] text-slate-500">confidence {Math.round(f.confidence * 100)}%</span>
          </div>
          {f.fix_hint && <p className="text-xs text-slate-700 mt-2"><span className="font-semibold text-indigo-700">How to fix:</span> {f.fix_hint}</p>}
          {(f.evidence || rows) && (
            <button onClick={() => setOpen(!open)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 mt-2 inline-flex items-center gap-1 cursor-pointer">
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Evidence
            </button>
          )}
          {open && (
            <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3 space-y-2">
              {f.evidence && <p className="whitespace-pre-wrap">{f.evidence}</p>}
              {rows && rows.map((r, i) => <p key={i} className="font-mono text-[11px]">{r.field}: “{String(r.submitted)}” vs “{String(r.official)}” — {r.reason}</p>)}
            </div>
          )}
        </div>
        {f.document_id && onOpenDoc && <Button variant="ghost" onClick={() => onOpenDoc(f.document_id!)}><FileSearch className="w-3.5 h-3.5" />View</Button>}
      </div>
    </div>
  );
};

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isOfficial = user?.role !== 'institution';
  const [app, setApp] = useState<Application | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [compliance, setCompliance] = useState<ComplianceEvaluation | null>(null);
  const [notices, setNotices] = useState<NotificationItem[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [tab, setTab] = useState<Tab>(isOfficial ? 'findings' : 'upload');
  const [focusDoc, setFocusDoc] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [showWhy, setShowWhy] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [noticing, setNoticing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const a = await applicationsApi.get(id);
    setApp(a);
    const [r, c, n, au] = await Promise.all([
      validationApi.getReport(id), complianceApi.check(id), notificationsApi.list(id), auditApi.getAppLogs(id),
    ]);
    setReport(r); setCompliance(c); setNotices(n); setAudit(au);
  }, [id]);

  useEffect(() => { load().catch((e) => setError(errorMessage(e))); }, [load]);

  const run = async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  if (error && !app) return <Empty title="Could not load application" hint={error} />;
  if (!app) return <div className="flex justify-center p-16"><Spinner /></div>;

  const editable = !isOfficial && (app.status === 'draft' || app.status === 'deficiency_found');
  const decided = app.status === 'approved' || app.status === 'rejected';
  const findings = report?.findings || [];
  const counts = report?.summary;
  const openDoc = (docId: string) => { setFocusDoc(docId); setTab('documents'); };

  const tabs: { key: Tab; label: string; icon: React.ElementType; show: boolean }[] = [
    { key: 'upload', label: 'Checklist & uploads', icon: ListChecks, show: !isOfficial },
    { key: 'findings', label: `Findings (${findings.length})`, icon: FileWarning, show: true },
    { key: 'documents', label: 'Document review', icon: FileSearch, show: true },
    { key: 'rules', label: 'Rules applied', icon: ShieldCheck, show: true },
    { key: 'notices', label: `Notices (${notices.length})`, icon: Bell, show: true },
    { key: 'audit', label: 'Audit trail', icon: ScrollText, show: true },
  ];

  return (
    <div className="space-y-5">
      <Link to={isOfficial ? '/applications' : '/'} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="w-3.5 h-3.5" />Back</Link>

      <div className="glass-panel rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-indigo-700 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200">{app.application_number}</span>
              <StatusPill status={app.status} />
              <Pill>{app.category.replace('_', ' ').toUpperCase()}</Pill>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{app.institution_name}</h1>
            <p className="text-xs text-slate-500">
              AICTE ID {app.permanent_id || '—'} · intake {app.requested_intake ?? '—'} · AY {app.academic_year} · submitted {fmtDay(app.submitted_at)}
              {app.rectification_due && app.status === 'deficiency_found' && <span className="text-rose-600 font-semibold"> · rectify by {fmtDay(app.rectification_due)}</span>}
            </p>
            {app.overall_verdict && <p className="text-xs text-slate-700"><span className="font-semibold">Official note:</span> {app.overall_verdict} {app.decided_at && <span className="text-slate-400">({fmtDate(app.decided_at)})</span>}</p>}
          </div>

          <div className="w-full lg:w-96 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <AIPill rec={app.ai_recommendation} />
              <span className={cx('text-2xl font-mono font-bold', app.risk_score >= 60 ? 'text-rose-600' : app.risk_score >= 25 ? 'text-amber-600' : 'text-emerald-600')} title="Risk score 0-100">{app.risk_score}</span>
            </div>
            <p className="text-xs text-slate-700">{app.ai_summary || 'Not screened yet.'}</p>
            {counts && (
              <p className="text-[11px] text-slate-500">{counts.critical_flags} critical · {counts.warning_flags} warnings · {counts.info_flags} info · screened {fmtDate(app.ai_reviewed_at)}</p>
            )}
            {counts && counts.risk_contributions.length > 0 && (
              <button onClick={() => setShowWhy(!showWhy)} className="text-[11px] font-semibold text-indigo-700 cursor-pointer">{showWhy ? 'Hide' : 'Why this score?'}</button>
            )}
            {showWhy && counts && (
              <ul className="text-[11px] text-slate-600 space-y-0.5 max-h-40 overflow-y-auto">
                {counts.risk_contributions.map((c, i) => <li key={i}>+{c.points} · {c.finding}</li>)}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <AdvisoryNote />
          <div className="flex flex-wrap gap-2">
            {isOfficial && !decided && app.status !== 'draft' && (
              <>
                <Button onClick={() => run('screen', () => validationApi.trigger(app.id))} busy={busy === 'screen'}><Play className="w-3.5 h-3.5" />Re-run screening</Button>
                <Button variant="danger" onClick={() => setNoticing(true)}><FileWarning className="w-3.5 h-3.5" />Issue deficiency notice</Button>
                <Button variant="primary" onClick={() => setDeciding(true)}><Gavel className="w-3.5 h-3.5" />Record decision</Button>
              </>
            )}
            {editable && (
              <>
                <Button onClick={() => run('check', () => validationApi.trigger(app.id))} busy={busy === 'check'}><Play className="w-3.5 h-3.5" />Run self-check</Button>
                <Button variant="primary" onClick={() => run('submit', () => applicationsApi.submit(app.id))} busy={busy === 'submit'}>
                  <Send className="w-3.5 h-3.5" />{app.status === 'draft' ? 'Submit to AICTE' : 'Resubmit after rectification'}
                </Button>
              </>
            )}
          </div>
        </div>
        {error && <p className="text-xs text-rose-600 mt-2" role="alert">{error}</p>}
      </div>

      <div className="flex border-b border-slate-200 gap-5 text-xs font-semibold overflow-x-auto" role="tablist">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={cx('pb-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer', tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'upload' && <UploadSlots app={app} editable={editable} onChanged={load} />}

      {tab === 'findings' && (
        <div className="space-y-3">
          {findings.length === 0 ? (
            <Empty title={app.ai_reviewed_at ? 'No open findings' : 'Not screened yet'} hint={app.ai_reviewed_at ? 'All configured checks passed.' : 'Run the self-check after uploading documents.'} />
          ) : (
            (['critical', 'warning', 'info'] as const).map((sev) => {
              const group = findings.filter((f) => f.severity === sev);
              if (!group.length) return null;
              return (
                <div key={sev} className="space-y-2">
                  <h3 className="text-[11px] uppercase font-bold tracking-wider text-slate-500">{sev} ({group.length})</h3>
                  {group.map((f) => <FindingRow key={f.id} f={f} onOpenDoc={openDoc} />)}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'documents' && <DocumentReview documents={app.documents || []} initialId={focusDoc} isOfficial={isOfficial} />}

      {tab === 'rules' && compliance && (
        <Card title={`Checklist evaluation — ${compliance.compliant_count}/${compliance.total_rules_evaluated} rules met`}>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-500 border-b border-slate-100"><th className="py-2">Rule</th><th>Result</th><th>Expected</th><th>Found</th><th>Detail</th></tr></thead>
            <tbody>
              {compliance.results.map((r) => (
                <tr key={r.rule_code} className="border-b border-slate-50 align-top">
                  <td className="py-2 pr-2"><p className="font-semibold text-slate-800">{r.title}</p><p className="text-[10px] font-mono text-slate-400">{r.rule_code} v{r.rule_version} · {r.category}</p></td>
                  <td className="pr-2"><Pill tone={r.status === 'compliant' ? 'emerald' : r.status === 'non_compliant' ? 'rose' : r.status === 'warning' ? 'amber' : 'slate'}>{r.status.replace('_', ' ')}</Pill></td>
                  <td className="pr-2 font-mono">{r.expected ?? '—'}</td>
                  <td className="pr-2 font-mono">{r.actual ?? '—'}</td>
                  <td className="text-slate-600">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'notices' && (notices.length === 0 ? <Empty title="No deficiency notices" /> : (
        <div className="space-y-3">
          {notices.map((n) => (
            <NoticeCard key={n.id} n={n} onAck={!isOfficial ? async (x) => { await notificationsApi.acknowledge(x.id); load(); } : undefined} />
          ))}
        </div>
      ))}

      {tab === 'audit' && (
        <Card title="Audit trail (hash-chained, append-only)">
          <ul className="divide-y divide-slate-100">
            {audit.map((e) => (
              <li key={e.id} className="py-2 text-xs flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p><span className="font-semibold text-slate-800">{e.action.replace(/_/g, ' ')}</span> <span className="text-slate-500">· {e.actor}{e.actor_role ? ` (${e.actor_role})` : ''}</span></p>
                  <p className="text-[11px] text-slate-500 truncate">{summarize(e.details)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-slate-400">{fmtDate(e.created_at)}</p>
                  {e.entry_hash && <p className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5 justify-end" title={e.entry_hash}><Hash className="w-3 h-3" />{e.entry_hash.slice(0, 10)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {deciding && <DecisionModal app={app} onClose={() => setDeciding(false)} onDone={() => { setDeciding(false); load(); }} />}
      {noticing && <NoticeModal app={app} findings={findings} onClose={() => setNoticing(false)} onDone={() => { setNoticing(false); setTab('notices'); load(); }} />}
    </div>
  );
};

const summarize = (d: Record<string, any>) =>
  Object.entries(d || {})
    .filter(([, v]) => typeof v !== 'object')
    .slice(0, 5)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');

const DecisionModal: React.FC<{ app: Application; onClose: () => void; onDone: () => void }> = ({ app, onClose, onDone }) => {
  const [status, setStatus] = useState('approved');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const aiAdverse = app.ai_recommendation === 'deficiency_suspected' || app.ai_recommendation === 'physical_inspection_suggested';
  const override = (status === 'approved' && aiAdverse) || ((status === 'rejected') && app.ai_recommendation === 'forward_for_approval');
  const needsReason = status === 'rejected' || override;
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await applicationsApi.decide(app.id, status, notes || undefined);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Record official decision" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-600">The AI recommendation is <span className="font-semibold">{AI_LABELS[app.ai_recommendation || 'pending'].label}</span>. You decide; your decision and reasons are recorded in the audit ledger.</p>
        <div>
          <label className="label" htmlFor="dec">Decision</label>
          <select id="dec" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="approved">Approve</option>
            <option value="verified">Mark verified (forward to approving authority)</option>
            <option value="under_review">Keep under review / request hearing</option>
            <option value="rejected">Reject</option>
          </select>
        </div>
        {override && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">This differs from the AI recommendation. Record why (e.g. inspection outcome, documents verified offline).</p>}
        <div>
          <label className="label" htmlFor="notes">Reasons {needsReason && <span className="text-rose-600">(required)</span>}</label>
          <textarea id="notes" rows={4} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" busy={busy} disabled={needsReason && notes.trim().length < 10} onClick={submit}>Record decision</Button>
        </div>
      </div>
    </Modal>
  );
};

const NoticeModal: React.FC<{ app: Application; findings: ValidationResult[]; onClose: () => void; onDone: () => void }> = ({ app, findings, onClose, onDone }) => {
  const candidates = findings.filter((f) => f.severity !== 'info');
  const [selected, setSelected] = useState<Set<string>>(new Set(candidates.map((f) => f.id)));
  const [notes, setNotes] = useState('Please rectify the items listed below and resubmit.');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const submit = async () => {
    setBusy(true);
    try {
      await applicationsApi.deficiencyNotice(app.id, notes, days, [...selected]);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <Modal title="Issue deficiency notice" onClose={onClose} wide>
      <div className="space-y-3">
        <p className="text-xs text-slate-600">Select the items to send. Each carries its evidence and a plain-language fix. The institution replaces only the affected documents.</p>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {candidates.map((f) => <FindingRow key={f.id} f={f} selectable selected={selected.has(f.id)} onToggle={() => toggle(f.id)} />)}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-3"><label className="label" htmlFor="nnotes">Note to institution</label><textarea id="nnotes" rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div><label className="label" htmlFor="days">Days to rectify</label><input id="days" type="number" min={1} max={60} className="input" value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
        </div>
        {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" busy={busy} disabled={selected.size === 0 || notes.trim().length < 5} onClick={submit}>Send notice ({selected.size} items)</Button>
        </div>
      </div>
    </Modal>
  );
};
