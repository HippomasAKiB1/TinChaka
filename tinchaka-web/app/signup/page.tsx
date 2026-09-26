'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth';
import { validateSignup } from '@/lib/validation';
import { ApiError } from '@/lib/api';
import { DemoCredentials } from '@/components/DemoCredentials';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('PASSENGER');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateSignup({ name, email, password, role });
    if (!validation.ok) {
      setError(validation.message || 'Invalid input');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await signup({ name, email, password, role });
      if (session.user.role === 'DRIVER') {
        router.push('/driver');
      } else {
        router.push('/passenger');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Signup failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemo = (account: { name: string; email: string; password: string; role: UserRole }) => {
    setName(account.name);
    setEmail(account.email);
    setPassword(account.password);
    setRole(account.role);
    setError(null);
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Create an Account</h1>
          <p className="text-sm text-slate-400 mt-1">Join TinChaka for shared rides in Dhaka</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-300 text-sm flex items-start gap-2">
            <span className="text-rose-400 font-bold">✕</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nusrat Jahan"
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. nusrat@tinchaka.dev"
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="password">
              Password (min 6 chars)
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer text-sm font-medium transition ${
                  role === 'PASSENGER'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="PASSENGER"
                  checked={role === 'PASSENGER'}
                  onChange={() => setRole('PASSENGER')}
                  className="sr-only"
                />
                <span>Passenger</span>
              </label>

              <label
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer text-sm font-medium transition ${
                  role === 'DRIVER'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="DRIVER"
                  checked={role === 'DRIVER'}
                  onChange={() => setRole('DRIVER')}
                  className="sr-only"
                />
                <span>Driver</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/60 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 mt-4"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Creating account...</span>
              </>
            ) : (
              <span>Create account</span>
            )}
          </button>
        </form>

        <DemoCredentials onSelect={handleSelectDemo} />

        <div className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Sign in here
          </Link>
        </div>
      </div>
    </main>
  );
}
