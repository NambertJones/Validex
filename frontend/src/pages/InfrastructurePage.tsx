import React, { useState, useEffect } from 'react';
import { Camera, Sparkles } from 'lucide-react';
import { infrastructureApi, applicationsApi } from '../api/client';
import type { Application } from '../types';

export const InfrastructurePage: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [labName, setLabName] = useState('Computer Systems & Embedded Laboratory');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cvResult, setCvResult] = useState<any | null>(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const data = await applicationsApi.list();
        setApps(data);
        if (data.length > 0) setSelectedAppId(data[0].id);
      } catch (err) {
        console.error('Error fetching applications:', err);
      }
    };
    fetchApps();
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhoto || !selectedAppId) return;

    setAnalyzing(true);
    setCvResult(null);

    try {
      const fd = new FormData();
      fd.append('application_id', selectedAppId);
      fd.append('file', selectedPhoto);
      fd.append('lab_name', labName);

      const res = await infrastructureApi.analyze(fd);
      setCvResult(res);
    } catch (err) {
      console.error('Infrastructure analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Infrastructure & Lab Computer Vision Studio</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          YOLOv8 vision pipeline for physical asset counting, student terminal density, and lab safety compliance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-600" />
            Upload Laboratory Photograph
          </h2>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Application</label>
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 cursor-pointer"
              >
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.application_number} — {a.institution_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Laboratory / Facility Name</label>
              <input
                type="text"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600"
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/70">
              <input
                type="file"
                id="infra-photo-input"
                accept="image/*"
                onChange={(e) => setSelectedPhoto(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="infra-photo-input" className="cursor-pointer block">
                <Camera className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-800 block">
                  {selectedPhoto ? selectedPhoto.name : 'Select Lab / Room Photo'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">JPEG or PNG format</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!selectedPhoto || analyzing}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
            >
              {analyzing ? 'Detecting Equipment with YOLOv8...' : 'Run Physical Inspection'}
            </button>
          </form>
        </div>

        {/* Results & Visualizer */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            Detection Telemetry & Norms Verification
          </h2>

          {!cvResult ? (
            <div className="py-24 text-center text-slate-400 text-xs font-medium">
              Upload a photograph of a computer laboratory, workshop, or campus building to detect hardware assets and safety gear.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Equipment Counts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(cvResult.equipment_counts || {}).map(([eq, count]) => (
                  <div key={eq} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium capitalize">{eq.replace('_', ' ')}</span>
                    <p className="text-xl font-bold font-mono text-slate-900 mt-1">{String(count)}</p>
                  </div>
                ))}
              </div>

              {/* Compliance checks against norms */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">AICTE Lab Norms Check</h3>
                {cvResult.compliance_flags?.map((flag: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{flag.equipment}</span>
                      <p className="text-slate-600 text-[11px] mt-0.5">{flag.message}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        flag.status === 'compliant'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {flag.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Annotated Preview */}
              {cvResult.annotated_image_base64 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Annotated Equipment Detection View
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-80">
                    <img
                      src={cvResult.annotated_image_base64}
                      alt="Annotated Lab Photo"
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
