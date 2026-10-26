import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Lock, Mail, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@aicte-india.org');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 shadow-xl shadow-indigo-600/20 mb-4">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Validex Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            AICTE Intelligent Document Validation, OCR & Forgery Detection System
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                  placeholder="officer@aicte-india.org"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/40 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating credentials...</span>
              ) : (
                <>
                  <span>Sign In to Scrutiny Bureau</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credential Selectors */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-3 text-center">
              Quick Role Test Logins
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@aicte-india.org', 'admin123')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 text-[11px] text-slate-700 font-semibold transition-all text-center flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('scrutiny@aicte-india.org', 'scrutiny123')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 hover:border-sky-200 border border-slate-200 text-[11px] text-slate-700 font-semibold transition-all text-center flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-sky-600" />
                <span>Scrutiny</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('principal@apex.edu.in', 'apex123')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-[11px] text-slate-700 font-semibold transition-all text-center flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Institution</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
