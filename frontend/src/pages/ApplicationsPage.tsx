import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowRight,
  Building,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { applicationsApi } from '../api/client';
import type { Application, ApplicationStatus, ApplicationCategory } from '../types';

export const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // New Application Modal State
  const [showModal, setShowModal] = useState(false);
  const [newInstName, setNewInstName] = useState('');
  const [newCategory, setNewCategory] = useState<ApplicationCategory>('eoa');
  const [creating, setCreating] = useState(false);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const data = await applicationsApi.list({
        status: selectedStatus || undefined,
        category: selectedCategory || undefined,
        search: search || undefined,
      });
      setApplications(data);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [selectedStatus, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApps();
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await applicationsApi.create({
        category: newCategory,
        academic_year: '2025-2026',
        institution_name: newInstName || undefined,
      });
      setShowModal(false);
      setNewInstName('');
      fetchApps();
    } catch (err) {
      console.error('Failed to create application:', err);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'approved':
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'deficiency_found':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Deficiency Found
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="w-3.5 h-3.5" /> Submitted
          </span>
        );
    }
  };

  const getRiskMeter = (score: number) => {
    let color = 'bg-emerald-500';
    let text = 'text-emerald-700';
    if (score >= 60) {
      color = 'bg-rose-500';
      text = 'text-rose-700';
    } else if (score >= 25) {
      color = 'bg-amber-500';
      text = 'text-amber-700';
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
          <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
        </div>
        <span className={`text-xs font-mono font-bold ${text}`}>{score}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AICTE Approval Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Institutional approval requests, scrutiny status, and automated risk scoring
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm shadow-indigo-600/25 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by institution name or AICTE-XXXX..."
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium px-3 py-2 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="deficiency_found">Deficiency Found</option>
            <option value="verified">Verified / Approved</option>
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium px-3 py-2 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="eoa">Extension of Approval (EOA)</option>
            <option value="new_institution">New Technical Campus</option>
            <option value="change_intake">Increase in Intake</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-6">Application ID</th>
                <th className="py-3.5 px-6">Institution Name</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">AI Risk Score</th>
                <th className="py-3.5 px-6">Submission Date</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 font-medium">
                    Loading applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 font-medium">
                    No applications match the current query criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-indigo-600">
                      {app.application_number}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{app.institution_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 uppercase font-mono text-[11px] font-medium">
                      {app.category.replace('_', ' ')}
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(app.status)}</td>
                    <td className="py-4 px-6">{getRiskMeter(app.risk_score)}</td>
                    <td className="py-4 px-6 text-slate-600 font-mono font-medium">
                      {new Date(app.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-semibold border border-indigo-200 transition-all cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Application Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Create New Approval Application</h2>
            <p className="text-xs text-slate-500 mb-5">
              Initiate an application for the AY 2025-2026 AICTE approval cycle
            </p>

            <form onSubmit={handleCreateApp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Institution Name
                </label>
                <input
                  type="text"
                  required
                  value={newInstName}
                  onChange={(e) => setNewInstName(e.target.value)}
                  placeholder="e.g., Delhi Institute of Engineering & Technology"
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 px-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Application Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ApplicationCategory)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 px-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 cursor-pointer"
                >
                  <option value="eoa">Extension of Approval (EOA)</option>
                  <option value="new_institution">New Technical Institution</option>
                  <option value="change_intake">Increase / Reduction in Intake</option>
                  <option value="closure">Course / Institution Closure</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Creating Application...' : 'Create Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
