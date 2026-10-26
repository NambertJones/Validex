import React from 'react';
import { Search, Bell, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Search Input */}
      <div className="flex items-center w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search applications, institutions, URNs..."
            className="w-full bg-slate-100/80 border border-slate-200 text-sm text-slate-800 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Status Badges & Quick Indicators */}
      <div className="flex items-center space-x-4">
        {/* Academic Year Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-semibold text-indigo-700">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>AY 2025-2026 Process Active</span>
        </div>

        {/* AI Engine Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>PaddleOCR + Forgery Core: Online</span>
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-all cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
        </button>

        {/* User Role Tag */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.full_name?.split(' ')[0]}</p>
            <p className="text-[10px] text-slate-500 font-medium capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
