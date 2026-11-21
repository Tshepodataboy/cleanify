import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, UserPlus, X } from 'lucide-react';
import type { AuthSessionResponse } from '../types';
import { api } from '../api/client';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  promptReason?: string | null;
  onClose: () => void;
  onAuthenticated: (session: AuthSessionResponse) => void;
}

export function AuthModal({
  isOpen,
  initialMode = 'login',
  promptReason,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setPassword('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'register' && displayName.trim().length < 2) {
      setError('Please enter your name (at least 2 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const session =
        mode === 'register'
          ? await api.auth.register({
              email: trimmedEmail,
              password,
              displayName: displayName.trim(),
            })
          : await api.auth.login({
              email: trimmedEmail,
              password,
            });
      setPassword('');
      onAuthenticated(session);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-heading"
    >
      <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="bg-[#3D634A] text-white px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#EAE8BA]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="auth-modal-heading" className="font-display text-lg font-bold text-[#F2F0C9]">
                {mode === 'login' ? 'Sign In to CleanCommons' : 'Create Neighbor Account'}
              </h2>
              <p className="text-xs text-white/80 truncate">
                Account access & Row-Level Security
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {promptReason && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-900">
              {promptReason}
            </div>
          )}

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-display-name"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  Full Name or Neighbor Handle
                </label>
                <input
                  id="auth-display-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Thabo Mokoena"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#3D634A]"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-800 mb-1">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.co.za"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#3D634A]"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#3D634A]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#3D634A] hover:bg-[#32523D] disabled:opacity-60 rounded-xl transition-colors cursor-pointer"
            >
              {mode === 'login' ? (
                <Lock className="w-4 h-4 text-[#EAE8BA]" aria-hidden="true" />
              ) : (
                <UserPlus className="w-4 h-4 text-[#EAE8BA]" aria-hidden="true" />
              )}
              <span>
                {submitting
                  ? 'Please wait...'
                  : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
              </span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3D634A] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Row-Level Security protects your records: only your account can edit or delete your
              reported spots, cancel your own RSVPs, or inspect volunteer rosters on events you
              host.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
