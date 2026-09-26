'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export function TopNav() {
  const { session, logout, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2.5 group">
          <span className="text-2xl font-black text-emerald-400 tracking-tight group-hover:text-emerald-300 transition-colors">
            TinChaka
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline font-medium">
            তিন চাকা — Dhaka Ride Pooling
          </span>
        </Link>

        <nav className="flex items-center">
          {isLoading ? (
            <div className="h-6 w-28 bg-slate-800/80 animate-pulse rounded"></div>
          ) : session ? (
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="hidden sm:inline">
                Logged in as <strong className="text-slate-100">{session.user.name}</strong>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                  session.user.role === 'DRIVER'
                    ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {session.user.role === 'DRIVER' ? 'Driver' : 'Passenger'}
              </span>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={logout}
                className="text-slate-400 hover:text-rose-400 text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm font-medium">
              <Link
                href="/login"
                className="text-slate-300 hover:text-white transition-colors px-2 py-1"
              >
                Login
              </Link>
              <span className="text-slate-600">/</span>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
