import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Cpu, ShieldCheck, Building2, UserCog, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi, errorMessage } from '../api/client';
import { Button } from '../components/ui';

// Synthetic demo accounts (seeded only outside production)
const DEMO = [
  { group: 'AICTE officials', icon: ShieldCheck, items: [
    { label: 'Scrutiny Officer', email: 'scrutiny@aicte-india.org', pass: 'scrutiny123' },
    { label: 'Admin (rules, users)', email: 'admin@aicte-india.org', pass: 'admin123' },
    { label: 'Expert Committee', email: 'expert@aicte-india.org', pass: 'expert123' },
  ] },
  { group: 'Institutions', icon: Building2, items: [
    { label: 'Apex (clean)', email: 'principal@apex.edu.in', pass: 'apex123' },
    { label: 'Zenith (problems)', email: 'principal@zenith.edu.in', pass: 'zenith123' },
    { label: 'Crescent', email: 'principal@crescent.edu.in', pass: 'crescent123' },
  ] },
];

export const LoginPage: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const doLogin = async (e?: string, p?: string) => {
    setBusy(true);
    setError('');
    try {
      await login(e ?? email, p ?? password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const doRegister = async () => {
    setBusy(true);
    setError('');
    try {
      await authApi.register({ email, password, full_name: fullName, institution_name: institution });
      await doLogin(email, password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Validex</h1>
              <p className="text-xs text-slate-500">AICTE application validation · decision support</p>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5 text-xs font-semibold">
            {(['login', 'register'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-lg cursor-pointer ${mode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                {m === 'login' ? 'Sign in' : 'Register institution'}
              </button>
            ))}
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mode === 'login' ? doLogin() : doRegister();
            }}
          >
            {mode === 'register' && (
              <>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" aria-label="Full name" className="input" />
                <input required value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Institution name (as registered with AICTE)" aria-label="Institution name" className="input" />
              </>
            )}
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className="input" autoComplete="username" />
            <input required type="password" minLength={mode === 'register' ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" className="input" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {error && <p className="text-xs text-rose-600 font-medium" role="alert">{error}</p>}
            <Button type="submit" variant="primary" busy={busy} className="w-full py-2.5">
              {mode === 'login' ? 'Sign in' : 'Create institution account'}
            </Button>
            {mode === 'register' && <p className="text-[11px] text-slate-500">Official (AICTE) accounts are created by an administrator.</p>}
          </form>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="w-4 h-4 text-indigo-600" /> Demo accounts (synthetic data)</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">One-click sign in for the prototype demonstration.</p>
          {DEMO.map((g) => (
            <div key={g.group} className="mb-4">
              <p className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><g.icon className="w-3.5 h-3.5" /> {g.group}</p>
              <div className="grid grid-cols-1 gap-2">
                {g.items.map((d) => (
                  <button key={d.email} onClick={() => doLogin(d.email, d.pass)} disabled={busy} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left cursor-pointer disabled:opacity-50">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-2"><UserCog className="w-3.5 h-3.5 text-indigo-600" />{d.label}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{d.email}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
