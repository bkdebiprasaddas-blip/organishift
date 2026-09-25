import { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
          <span className="text-sm font-semibold">Restoring session...</span>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-indigo-50 via-white to-white font-sans text-slate-900 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/assets/logo.svg" alt="OrganiShift" className="h-20 w-auto drop-shadow-md" />
          <h1 className="mt-3 text-xl font-bold tracking-tight">Sign in to OrganiShift</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 font-medium">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>

            <div className="-mx-1 mt-5 border-t border-slate-200 pt-3">
              <p className="text-center text-xs font-semibold text-slate-500">Developer quick-login</p>
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {[
                  { label: 'ADMIN',  email: 'admin@organishift.dev' },
                  { label: 'MANAGER', email: 'manager@organishift.dev' },
                  { label: 'MEMBER',  email: 'member1@organishift.dev' },
                ].map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => { setEmail(u.email); setPassword('Password123!'); }}
                    className="text-left rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs hover:bg-slate-50 hover:border-slate-400 transition"
                  >
                    <span className="inline-block w-14 font-medium text-slate-600">{u.label}:</span>
                    <span className="text-slate-500 break-all">{u.email}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">password: <code className="rounded bg-slate-100 px-1 py-0.5">Password123!</code></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
