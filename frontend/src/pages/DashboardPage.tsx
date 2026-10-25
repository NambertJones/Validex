import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { dashboardApi } from '../api/client';
import type { DashboardStats, RiskDistributionItem, AlertItem, ActivityItem } from '../types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [riskDist, setRiskDist] = useState<RiskDistributionItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, r, a, act] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRiskDistribution(),
        dashboardApi.getAlerts(),
        dashboardApi.getRecentActivity(),
      ]);
      setStats(s);
      setRiskDist(r);
      setAlerts(a);
      setActivity(act);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Scrutiny Intelligence Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Real-time automated document validation, fraud detection & compliance monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs font-medium text-gray-300 hover:text-white hover:border-gray-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
          <Link
            to="/applications"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
          >
            <span>View All Applications</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Ingested</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-white">{stats?.total_applications ?? 0}</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">+18%</span> from previous cycle
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Under Review</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-white">{stats?.under_review ?? 0}</h3>
            <p className="text-xs text-gray-400 mt-1">Pending committee sign-off</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Deficiencies Flagged</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-rose-400">{stats?.deficiency_found ?? 0}</h3>
            <p className="text-xs text-gray-400 mt-1">Rectification notices auto-dispatched</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Verified & Approved</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-400">{stats?.verified_approved ?? 0}</h3>
            <p className="text-xs text-gray-400 mt-1">Passed all statutory checks</p>
          </div>
        </div>
      </div>

      {/* Analytics & Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Category Distribution Donut */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Risk Score Distribution</h2>
            <p className="text-xs text-gray-400 mt-0.5">Automated AI risk categorization across active cohort</p>
          </div>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {riskDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#374151',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-gray-800">
            {riskDist.map((item) => (
              <div key={item.category} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-300 truncate">{item.category}</span>
                <span className="text-xs font-mono font-semibold text-white ml-auto">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fraud & Forgery Breakdown */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Integrity & Forensics Detection Performance
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Total documents analyzed: <span className="text-white font-mono">{stats?.total_documents_processed ?? 0}</span> | Forgery detections: <span className="text-rose-400 font-mono font-semibold">{stats?.forgery_detected_count ?? 0}</span>
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 font-mono text-xs font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> ELA + SIFT Active
            </span>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Fire Safety', clean: 88, flagged: 12 },
                  { name: 'Audit Reports', clean: 94, flagged: 6 },
                  { name: 'Land Deeds', clean: 91, flagged: 9 },
                  { name: 'Faculty Lists', clean: 85, flagged: 15 },
                  { name: 'Affidavits', clean: 97, flagged: 3 },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={11} />
                <YAxis stroke="#6B7280" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#374151',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="clean" name="Authentic / Clean" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="flagged" name="Tampered / Forged" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-800">
            <span>Median verification latency: 4.2 hours</span>
            <span className="text-indigo-400 hover:underline cursor-pointer">View full forensics metrics &rarr;</span>
          </div>
        </div>
      </div>

      {/* Alerts and Activity Feed Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Scrutiny Alerts */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Active Scrutiny Alerts
            </h2>
            <span className="text-xs font-mono text-gray-400">{alerts.length} pending</span>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No high-severity alerts detected in active queue.</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    alert.severity === 'critical'
                      ? 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                      : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white">{alert.title}</p>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{alert.message}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/60 text-[11px] text-gray-400">
                    <span className="font-medium text-gray-300">{alert.institution_name}</span>
                    <Link
                      to={`/applications/${alert.application_id}`}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                    >
                      <span>Investigate</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live System Activity Feed */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-400" />
              Live Governance Activity
            </h2>
            <Link to="/audit" className="text-xs text-indigo-400 hover:underline">
              View Audit Log
            </Link>
          </div>

          <div className="space-y-3">
            {activity.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No recent activity recorded.</p>
            ) : (
              activity.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-200">{act.action}</span>
                      <span className="text-[10px] text-gray-500 font-mono">by {act.user_name}</span>
                    </div>
                    <p className="text-gray-400 truncate text-[11px]">{act.institution_name}</p>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 shrink-0">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
