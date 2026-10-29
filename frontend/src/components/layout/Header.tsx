import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Shield, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/client';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [openNotices, setOpenNotices] = useState(0);
  const isInstitution = user?.role === 'institution';

  useEffect(() => {
    if (!isInstitution) return;
    notificationsApi.list().then((n) => setOpenNotices(n.filter((x) => x.status === 'sent').length)).catch(() => {});
  }, [isInstitution]);

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
      {!isInstitution ? (
        <form
          className="relative w-96"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/applications?search=${encodeURIComponent(query)}`);
          }}
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search applications"
            placeholder="Search by institution or application number…"
            className="w-full bg-slate-100/80 border border-slate-200 text-sm text-slate-800 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>
      ) : (
        <p className="text-sm text-slate-600">Prepare and submit your AICTE approval application.</p>
      )}

      <div className="flex items-center space-x-4">
        {!isInstitution && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700" title="AI output is advisory; humans decide">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Decision-support mode</span>
          </div>
        )}
        {isInstitution && (
          <button onClick={() => navigate('/notices')} aria-label="Clarification requests" className="relative p-2 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer">
            <Bell className="w-4 h-4" />
            {openNotices > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">{openNotices}</span>
            )}
          </button>
        )}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.full_name?.split(' (')[0]}</p>
            <p className="text-[10px] text-slate-500 font-medium capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
