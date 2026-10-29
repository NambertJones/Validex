import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { applicationsApi, triageApi } from '../api/client';
import type { Application, TriageQueueItem } from '../types';
import { AIPill, Empty, Pill, Spinner, StatusPill, fmtDay } from '../components/ui';

const riskTone = (r: number) => (r >= 60 ? 'text-rose-600' : r >= 25 ? 'text-amber-600' : 'text-emerald-600');

export const ApplicationsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [apps, setApps] = useState<Application[]>([]);
  const [rag, setRag] = useState<Record<string, TriageQueueItem>>({});
  const [loading, setLoading] = useState(true);
  const search = params.get('search') || '';
  const status = params.get('status') || '';

  useEffect(() => {
    setLoading(true);
    Promise.all([applicationsApi.list({ search: search || undefined, status: status || undefined }), triageApi.queue()])
      .then(([list, queue]) => {
        const byId = Object.fromEntries(queue.map((q) => [q.application.id, q]));
        // Unreviewed red items first, then risk
        setApps([...list].sort((a, b) => (byId[b.id]?.red_unreviewed || 0) - (byId[a.id]?.red_unreviewed || 0) || b.risk_score - a.risk_score));
        setRag(byId);
      })
      .finally(() => setLoading(false));
  }, [search, status]);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Triage Queue</h1>
        <p className="text-sm text-slate-500 mt-0.5">Officers only. Ordered by unreviewed red items, then risk. Green passes automatically; amber goes back to the institution as an encrypted clarification request; red needs your confirmation or override.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input defaultValue={search} onKeyDown={(e) => e.key === 'Enter' && set('search', (e.target as HTMLInputElement).value)} placeholder="Institution or application number (Enter)" aria-label="Search" className="input pl-9" />
        </div>
        <select value={status} onChange={(e) => set('status', e.target.value)} aria-label="Status filter" className="input w-52">
          <option value="">All except drafts</option>
          <option value="under_review">Under review</option>
          <option value="submitted">Submitted</option>
          <option value="deficiency_found">Deficiency notice</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : apps.length === 0 ? (
          <Empty title="No applications match" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Application</th>
                <th className="text-left px-4 py-3">Institution</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Red · amber</th>
                <th className="text-left px-4 py-3">AI advisory</th>
                <th className="text-right px-4 py-3">Risk</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apps.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold text-indigo-700">{a.application_number}</p>
                    <p className="text-[11px] text-slate-500 uppercase">{a.category.replace('_', ' ')} · {a.academic_year} · {fmtDay(a.submitted_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{a.institution_name}</td>
                  <td className="px-4 py-3"><StatusPill status={a.status} /></td>
                  <td className="px-4 py-3 text-xs">
                    {rag[a.id] ? (
                      <span className="flex gap-1.5">
                        <Pill tone={rag[a.id].red_unreviewed ? 'rose' : 'slate'} title="Unreviewed / total red">{rag[a.id].red_unreviewed}/{rag[a.id].red} red</Pill>
                        <Pill tone={rag[a.id].amber ? 'amber' : 'slate'}>{rag[a.id].amber} amber</Pill>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3"><AIPill rec={a.ai_recommendation} /></td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${riskTone(a.risk_score)}`}>{a.risk_score}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/applications/${a.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">Review <ArrowRight className="w-3.5 h-3.5" /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
