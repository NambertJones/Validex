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
    <aside className="w-64 bg-[#0E1322] border-r border-gray-800 flex flex-col justify-between shrink-0">
      <div>
        {/* Logo and Brand */}
        <div className="p-6 border-b border-gray-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-wide flex items-center gap-1.5">
              Validex <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">AICTE</span>
            </h1>
            <p className="text-xs text-gray-400 font-medium">Smart Approval Portal</p>
          </div>
        </div>

        {/* Institution Badge if available */}
        {user?.institution_name && (
          <div className="mx-4 mt-4 p-2.5 rounded-lg bg-gray-800/40 border border-gray-700/50 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="text-xs text-gray-300 truncate font-medium">{user.institution_name}</p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
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
      <div className="p-4 border-t border-gray-800/80">
        <div className="flex items-center justify-between p-2 rounded-xl bg-gray-900/60 border border-gray-800">
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-semibold text-xs flex items-center justify-center shrink-0">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-gray-200 truncate">{user?.full_name || 'Officer'}</p>
              <p className="text-[10px] uppercase font-mono tracking-wider text-cyan-400">{user?.role || 'Guest'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
