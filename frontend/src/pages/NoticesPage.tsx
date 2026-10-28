import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2 } from 'lucide-react';
import { notificationsApi } from '../api/client';
import type { NotificationItem } from '../types';
import { Button, Card, Empty, Pill, SeverityIcon, Spinner, fmtDate, fmtDay } from '../components/ui';

export const NoticeCard: React.FC<{ n: NotificationItem; onAck?: (n: NotificationItem) => void; showLink?: boolean }> = ({ n, onAck, showLink }) => (
  <Card
    title={<span className="flex items-center gap-2"><Bell className="w-4 h-4 text-rose-600" />{n.subject}</span>}
    actions={<Pill tone={n.status === 'resolved' ? 'emerald' : n.status === 'acknowledged' ? 'sky' : 'rose'}>{n.status}</Pill>}
  >
    <p className="text-[11px] text-slate-500 mb-3">
      Sent {fmtDate(n.created_at)} via {n.channels.join(' + ')} · rectify by <span className="font-semibold text-rose-600">{fmtDay(n.due_date)}</span>
    </p>
    <ol className="space-y-2">
      {n.items.map((it, i) => (
        <li key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-xs font-semibold text-slate-900 flex items-start gap-2"><SeverityIcon severity={it.severity} className="w-3.5 h-3.5 mt-0.5 shrink-0" />{it.message}</p>
          <p className="text-xs text-slate-600 mt-1 pl-5"><span className="font-semibold text-indigo-700">What to do:</span> {it.fix_hint}</p>
        </li>
      ))}
    </ol>
    <div className="flex justify-end gap-2 mt-3">
      {showLink && <Link to={`/applications/${n.application_id}`} className="text-xs font-semibold text-indigo-600 px-3 py-2">Open application to rectify →</Link>}
      {onAck && n.status === 'sent' && <Button variant="primary" onClick={() => onAck(n)}><CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge</Button>}
    </div>
  </Card>
);

export const NoticesPage: React.FC = () => {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  useEffect(() => { notificationsApi.list().then(setItems); }, []);
  const ack = async (n: NotificationItem) => {
    const updated = await notificationsApi.acknowledge(n.id);
    setItems((prev) => prev?.map((x) => (x.id === n.id ? updated : x)) || null);
  };
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Deficiency Notices</h1>
        <p className="text-sm text-slate-500 mt-0.5">Each item says exactly what to fix. Replace only the affected documents, then resubmit.</p>
      </div>
      {items === null ? <div className="flex justify-center p-10"><Spinner /></div> : items.length === 0 ? <Empty title="No notices" /> : items.map((n) => <NoticeCard key={n.id} n={n} onAck={ack} showLink />)}
    </div>
  );
};
