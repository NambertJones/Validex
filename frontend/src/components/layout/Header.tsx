import React from 'react';
import { Search, Bell, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-[#0E1322]/80 backdrop-blur-md border-b border-gray-800/80 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Search Input */}
      <div className="flex items-center w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search applications, institutions, URNs..."
            className="w-full bg-gray-900/60 border border-gray-800 text-sm text-gray-200 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Status Badges & Quick Indicators */}
      <div className="flex items-center space-x-4">
        {/* Academic Year Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AY 2025-2026 Process Active</span>
        </div>

        {/* AI Engine Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>PaddleOCR + Forgery Core: Online</span>
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-all">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-[#0E1322]" />
        </button>

        {/* User Role Tag */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-medium text-gray-200 leading-tight">{user?.full_name?.split(' ')[0]}</p>
            <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
