'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function HomePage() {
  const { session, isLoading } = useAuth();

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-lg w-full p-8 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          TinChaka — live in Dhaka
        </div>

        <h1 className="text-4xl font-extrabold text-emerald-400 tracking-tight">
          TinChaka
        </h1>
        <p className="mt-2 text-lg text-slate-200 font-medium">
          তিন চাকা — Dhaka Ride Pooling MVP
        </p>
        <p className="mt-3 text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
          Share a seat. Split the fare. Beat the gridlock together with algorithmic auto-rickshaw pooling.
        </p>

        <div className="mt-8 border-t border-slate-700/60 pt-6">
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
              <span className="w-5 h-5 border-2 border-slate-500 border-t-emerald-400 rounded-full animate-spin"></span>
              <span>Loading session...</span>
            </div>
          ) : session ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Active Session
                </p>
                <p className="text-lg font-bold text-slate-100 mt-1">
                  Welcome back, <span className="text-emerald-400">{session.user.name}</span>!
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Logged in as a {session.user.role === 'DRIVER' ? 'Driver' : 'Passenger'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {session.user.role === 'DRIVER' ? (
                  <Link
                    href="/driver"
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-colors shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2"
                  >
                    <span>Go to Driver Dashboard</span>
                    <span>→</span>
                  </Link>
                ) : (
                  <Link
                    href="/passenger"
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
                  >
                    <span>Go to Passenger Dashboard</span>
                    <span>→</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/passenger"
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5"
              >
                <span>Request a ride</span>
                <span className="text-emerald-200">→</span>
              </Link>
              <Link
                href="/driver"
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-medium text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Drive with TinChaka</span>
                <span className="text-slate-400">→</span>
              </Link>
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-6 text-xs text-slate-400">
          <span>🚗 Same-zone pooling</span>
          <span>⚡ Real-time seats</span>
          <span>🇧🇩 Dhaka core</span>
        </div>
      </div>
    </main>
  );
}
