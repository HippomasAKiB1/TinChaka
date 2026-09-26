'use client';

import React, { useState } from 'react';

// Story cast per docs/PROJECT_PLAN.md §0 — do not replace with generic user1/driver1.
export const DEMO_ACCOUNTS = [
  { name: 'Nusrat', email: 'nusrat@tinchaka.dev', password: 'tinchaka123', role: 'PASSENGER' as const, note: 'Primary passenger (Banani)' },
  { name: 'Rafiq', email: 'rafiq@tinchaka.dev', password: 'tinchaka123', role: 'PASSENGER' as const, note: 'Second passenger (Banani)' },
  { name: 'Shirin', email: 'shirin@tinchaka.dev', password: 'tinchaka123', role: 'PASSENGER' as const, note: 'Third passenger (Banani)' },
  { name: 'Jashim', email: 'jashim@tinchaka.dev', password: 'tinchaka123', role: 'DRIVER' as const, note: 'Driver of Bullet (auto-rickshaw)' },
];

interface DemoCredentialsProps {
  onSelect?: (account: typeof DEMO_ACCOUNTS[number]) => void;
}

export function DemoCredentials({ onSelect }: DemoCredentialsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-6 border border-slate-700/70 rounded-xl bg-slate-800/50 backdrop-blur-sm overflow-hidden text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-300 hover:text-emerald-400 hover:bg-slate-800/80 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-emerald-400">⚡</span>
          <span>Demo Accounts (Story Cast)</span>
        </span>
        <span className="text-xs text-slate-400">
          {isOpen ? 'Hide ▲' : 'Show ▼'}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-700/60 space-y-2.5 text-xs text-slate-300">
          <p className="text-slate-400 mb-2">
            Click any account to auto-fill credentials:
          </p>
          {DEMO_ACCOUNTS.map((acc) => (
            <div
              key={acc.email}
              onClick={() => onSelect?.(acc)}
              className={`p-2.5 rounded-lg border border-slate-700/60 bg-slate-900/60 flex items-center justify-between gap-3 ${
                onSelect ? 'cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800/80 transition' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{acc.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      acc.role === 'DRIVER'
                        ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {acc.role}
                  </span>
                </div>
                <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                  {acc.email} <span className="text-slate-600">/</span> {acc.password}
                </div>
              </div>
              {onSelect && (
                <span className="text-emerald-400 text-[11px] font-medium hover:underline">
                  Use
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
