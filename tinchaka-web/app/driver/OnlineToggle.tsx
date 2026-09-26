'use client';

import React, { useState } from 'react';
import { setOnline } from '@/lib/driver';

interface OnlineToggleProps {
  isOnline: boolean;
  token: string;
  onToggle: (nextState: boolean) => void;
}

export function OnlineToggle({ isOnline, token, onToggle }: OnlineToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (isUpdating) return;

    const nextState = !isOnline;
    // Optimistic UI update
    onToggle(nextState);
    setIsUpdating(true);
    setError(null);

    try {
      await setOnline(nextState, token);
    } catch (err: unknown) {
      // Revert optimistic update on failure
      onToggle(!nextState);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update online status');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-5 bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-3.5 h-3.5 rounded-full ${
            isOnline ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20' : 'bg-slate-500'
          }`}
        />
        <div>
          <h2 className="text-base font-bold text-slate-100">
            {isOnline ? 'Vehicle is Online & Available' : 'Vehicle is Offline'}
          </h2>
          <p className="text-xs text-slate-400">
            {isOnline
              ? 'Accepting ride requests and building pooled trips in your zone'
              : 'Go online to see pending passenger requests in Dhaka'}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
        <button
          type="button"
          disabled={isUpdating}
          onClick={handleToggle}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 ${
            isOnline
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30'
              : 'bg-slate-700/80 text-slate-300 border border-slate-600 hover:bg-slate-700 hover:text-white'
          }`}
        >
          {isUpdating && (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          <span>{isOnline ? 'You are ONLINE — Go offline' : 'You are OFFLINE — Go online'}</span>
        </button>
        {error && <span className="text-[11px] text-rose-400 mt-1">{error}</span>}
      </div>
    </div>
  );
}
