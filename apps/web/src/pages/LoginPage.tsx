/**
 * LoginPage — authentication form for staff, delivery, and admin users.
 *
 * Submits credentials via the AuthContext login method. Redirects to the
 * appropriate dashboard based on the user's role after successful login.
 */

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@laundry/shared';
import { useAuth } from '../hooks/useAuth';

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);

      // After login, the auth context has the user. We read from the login
      // response indirectly — the context is updated synchronously before
      // this resolves. We can peek at role via a trick: re-read from context
      // won't work mid-render, so we parse the JWT or just redirect to
      // /dashboard and let the route guards sort it out.
      // A simpler approach: always redirect to /dashboard; if the user is
      // delivery-only, the ProtectedRoute will redirect them.
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {/* Branding */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-md bg-brand-500 flex items-center justify-center text-white font-bold text-lg">
            L
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Laundry Dashboard</h1>
            <p className="text-sm text-slate-500">Sign in to your account</p>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-4 rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@laundry.local"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand-600 text-white py-2.5 text-sm font-medium hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
