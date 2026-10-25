import React, { useEffect, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { auditApi } from '../api/client';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await auditApi.getSystemLogs();
        setLogs(data);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Audit & Governance Trail</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Immutable cryptographic audit logs recording every document ingestion, fraud detection, and official decision
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Tamper-Resistant Log Active</span>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit actions, filenames, or decisions..."
            className="w-full bg-gray-900 border border-gray-800 text-xs text-gray-200 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-xs font-mono text-gray-400">{filteredLogs.length} events logged</span>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">Action</th>
                <th className="py-3.5 px-6">Target Application</th>
                <th className="py-3.5 px-6">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500 font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500 font-sans">
                    No matching events recorded.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3.5 px-6 text-gray-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-semibold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-gray-300">
                      {log.application_id ? log.application_id.slice(0, 8) + '...' : 'System'}
                    </td>
                    <td className="py-3.5 px-6 text-gray-400 max-w-md truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
