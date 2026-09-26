'use client';

import React from 'react';
import { RideRequestWithPool } from '@/lib/rides';
import { formatPoysha } from '@/lib/format';

interface HistoryListProps {
  rides: RideRequestWithPool[];
}

export function HistoryList({ rides }: HistoryListProps) {
  const pastRides = rides.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'CANCELLED'
  );

  return (
    <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">Ride History</h2>
        <span className="text-xs text-slate-400">
          {pastRides.length} {pastRides.length === 1 ? 'trip' : 'trips'}
        </span>
      </div>

      {pastRides.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-700/60 rounded-xl">
          No completed rides yet.
        </div>
      ) : (
        <div className="space-y-3">
          {pastRides.map((ride) => {
            const isCompleted = ride.status === 'COMPLETED';
            const dateStr = new Date(ride.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={ride.id}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">
                      {ride.pickup_zone} → {ride.destination_zone}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {ride.status}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    {dateStr} · {ride.seats_requested} {ride.seats_requested === 1 ? 'seat' : 'seats'}
                  </div>
                </div>

                <div className="text-right">
                  {ride.final_fare_poysha != null ? (
                    <div>
                      <div className="font-bold text-sm text-emerald-400">
                        {formatPoysha(ride.final_fare_poysha)}
                      </div>
                      {ride.final_fare_poysha !== ride.estimated_fare_poysha && (
                        <div className="text-[10px] text-slate-500 line-through">
                          {formatPoysha(ride.estimated_fare_poysha)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="font-semibold text-slate-400">
                      {formatPoysha(ride.estimated_fare_poysha)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
