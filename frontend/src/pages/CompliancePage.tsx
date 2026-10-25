import React, { useEffect, useState } from 'react';
import { CheckCircle2, BookOpen } from 'lucide-react';
import { complianceApi } from '../api/client';
import type { ComplianceRule } from '../types';

export const CompliancePage: React.FC = () => {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const data = await complianceApi.getRules();
        setRules(data);
      } catch (err) {
        console.error('Error fetching compliance rules:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AICTE Handbook Norms & Rule Engine</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Configurable statutory criteria used by the decision-support engine to evaluate institutional eligibility
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <BookOpen className="w-4 h-4" />
          <span>Approval Process Handbook 2024-2027</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-16 text-gray-500 text-xs">Loading statutory rules...</div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10">
                    {rule.rule_code}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-800 text-cyan-400 font-semibold">
                    {rule.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1">{rule.title}</h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">{rule.description}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-mono text-[11px]">
                  Condition: {JSON.stringify(rule.conditions)}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
