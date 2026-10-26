import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck2,
  Files,
  ShieldCheck,
  Camera,
  History,
  LogOut,
  Building2,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/applications', label: 'Applications', icon: FileCheck2 },
    { to: '/documents', label: 'Document Lab', icon: Files },
    { to: '/compliance', label: 'Norms & Compliance', icon: ShieldCheck },
    { to: '/infrastructure', label: 'Infra CV Studio', icon: Camera },
    { to: '/audit', label: 'Audit Trail', icon: History },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-sm z-30">
      <div>
        {/* Logo and Brand */}
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-1.5">
              Validex <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-semibold">AICTE</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Smart Approval Portal</p>
          </div>
        </div>

        {/* Institution Badge if available */}
        {user?.institution_name && (
          <div className="mx-4 mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <p className="text-xs text-slate-700 truncate font-medium">{user.institution_name}</p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-4 space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User profile & Logout */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name || 'Officer'}</p>
              <p className="text-[10px] uppercase font-mono tracking-wider text-indigo-600 font-bold">{user?.role || 'Guest'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
