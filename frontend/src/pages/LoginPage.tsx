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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0B0F19] p-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-xl shadow-indigo-500/25 mb-4">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Validex Portal</h1>
          <p className="text-sm text-gray-400 mt-1">
            AICTE Intelligent Document Validation, OCR & Forgery Detection System
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-700/80 text-sm text-gray-100 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="officer@aicte-india.org"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-700/80 text-sm text-gray-100 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 focus:ring-2 focus:ring-indigo-500/50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
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
          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-3 text-center">
              Quick Role Test Logins
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@aicte-india.org', 'admin123')}
                className="p-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-[11px] text-gray-300 font-medium transition-all text-center flex flex-col items-center gap-1"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('scrutiny@aicte-india.org', 'scrutiny123')}
                className="p-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-[11px] text-gray-300 font-medium transition-all text-center flex flex-col items-center gap-1"
              >
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>Scrutiny</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('principal@apex.edu.in', 'apex123')}
                className="p-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-[11px] text-gray-300 font-medium transition-all text-center flex flex-col items-center gap-1"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Institution</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
