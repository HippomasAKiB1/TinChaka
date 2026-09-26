'use client';

import React from 'react';
import { Pool } from '@/lib/driver';
import { formatPoysha } from '@/lib/format';

interface DriverHistoryProps {
  history: Pool[];
}

export function DriverHistory({ history }: DriverHistoryProps) {
  const pastPools = history.filter(
    (p) => p.status === 'COMPLETED' || p.status === 'CANCELLED'
  );

  return (
    <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">Trip History</h2>
        <span className="text-xs text-slate-400">
          {pastPools.length} {pastPools.length === 1 ? 'trip' : 'trips'} logged
        </span>
      </div>

      {pastPools.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-700/60 rounded-xl">
          No completed trips yet.
        </div>
      ) : (
        <div className="space-y-3">
          {pastPools.map((pool) => {
            const isCompleted = pool.status === 'COMPLETED';
            const dateStr = new Date(pool.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const activeMembers = pool.ride_requests.filter((r) => r.status !== 'CANCELLED');
            const totalFaresPoysha = activeMembers.reduce(
              (sum, r) => sum + (r.final_fare_poysha ?? r.estimated_fare_poysha),
              0
            );

            return (
              <div
                key={pool.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">
                      Pool trip #{pool.id.slice(0, 8)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {pool.status}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    {dateStr} · {activeMembers.length} {activeMembers.length === 1 ? 'rider' : 'riders'}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    Total Fares
                  </span>
                  <div className="font-extrabold text-sm text-emerald-400">
                    {formatPoysha(totalFaresPoysha)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
