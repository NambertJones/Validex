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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'deficiency_found':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Deficiency Found
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Clock className="w-3.5 h-3.5" /> Submitted
          </span>
        );
    }
  };

  const getRiskMeter = (score: number) => {
    let color = 'bg-emerald-500';
    let text = 'text-emerald-400';
    if (score >= 60) {
      color = 'bg-rose-500';
      text = 'text-rose-400';
    } else if (score >= 25) {
      color = 'bg-amber-500';
      text = 'text-amber-400';
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-16 bg-gray-800 rounded-full h-2 overflow-hidden">
          <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
        </div>
        <span className={`text-xs font-mono font-semibold ${text}`}>{score}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AICTE Approval Applications</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Institutional approval requests, scrutiny status, and automated risk scoring
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by institution name or AICTE-XXXX..."
            className="w-full bg-gray-900 border border-gray-800 text-xs text-gray-200 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-xs text-gray-300 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
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
            className="bg-gray-900 border border-gray-800 text-xs text-gray-300 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="eoa">Extension of Approval (EOA)</option>
            <option value="new_institution">New Technical Campus</option>
            <option value="change_intake">Increase in Intake</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
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
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Loading applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No applications match the current query criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-indigo-400">
                      {app.application_number}
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-200">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="truncate max-w-xs">{app.institution_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-400 uppercase font-mono text-[11px]">
                      {app.category.replace('_', ' ')}
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(app.status)}</td>
                    <td className="py-4 px-6">{getRiskMeter(app.risk_score)}</td>
                    <td className="py-4 px-6 text-gray-400 font-mono">
                      {new Date(app.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-medium transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
            <h2 className="text-lg font-bold text-white mb-1">Create New Approval Application</h2>
            <p className="text-xs text-gray-400 mb-5">
              Initiate an application for the AY 2025-2026 AICTE approval cycle
            </p>

            <form onSubmit={handleCreateApp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Institution Name
                </label>
                <input
                  type="text"
                  required
                  value={newInstName}
                  onChange={(e) => setNewInstName(e.target.value)}
                  placeholder="e.g., Delhi Institute of Engineering & Technology"
                  className="w-full bg-gray-900 border border-gray-700 text-sm text-gray-100 px-4 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Application Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ApplicationCategory)}
                  className="w-full bg-gray-900 border border-gray-700 text-sm text-gray-100 px-4 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  <option value="eoa">Extension of Approval (EOA)</option>
                  <option value="new_institution">New Technical Institution</option>
                  <option value="change_intake">Increase / Reduction in Intake</option>
                  <option value="closure">Course / Institution Closure</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
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
