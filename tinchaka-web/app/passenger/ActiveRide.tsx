'use client';

import React, { useState } from 'react';
import { RideRequestWithPool, RideStatus } from '@/lib/rides';
import { formatPoysha } from '@/lib/format';

interface ActiveRideProps {
  ride: RideRequestWithPool;
  currentUserId: string;
  onCancel: (rideId: string) => Promise<void>;
}

const STAGES: { key: RideStatus; label: string }[] = [
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'MATCHED', label: 'Matched' },
  { key: 'DRIVER_ARRIVED', label: 'Arrived' },
  { key: 'STARTED', label: 'Started' },
  { key: 'COMPLETED', label: 'Completed' },
];

export function ActiveRide({ ride, currentUserId, onCancel }: ActiveRideProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const currentStageIndex = STAGES.findIndex((s) => s.key === ride.status);
  const isStarted = ride.status === 'STARTED';
  const isTerminal = ride.status === 'COMPLETED' || ride.status === 'CANCELLED';
  const canCancel = ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED'].includes(ride.status);

  // Other co-passengers in the pool (excluding current user's request)
  const coPassengers = (ride.pool_members || []).filter((m) => m.id !== ride.id);

  const handleCancelClick = async () => {
    if (!canCancel || isCancelling) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await onCancel(ride.id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCancelError(err.message);
      } else {
        setCancelError('Failed to cancel ride');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Active Journey
          </span>
          <h2 className="text-xl font-bold text-slate-100 mt-0.5">
            {ride.pickup_zone} → {ride.destination_zone}
          </h2>
        </div>
        <div className="text-right">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
            {ride.seats_requested} {ride.seats_requested === 1 ? 'Seat' : 'Seats'}
          </span>
        </div>
      </div>

      {/* Visual Progress Stepper (§2.3) */}
      <div className="py-2">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-700 -z-0" />
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage.key} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-900 ring-4 ring-slate-800'
                      : isCurrent
                      ? 'bg-emerald-400 text-slate-900 ring-4 ring-emerald-500/40 animate-pulse'
                      : 'bg-slate-700 text-slate-400 ring-4 ring-slate-800'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-[11px] font-medium mt-1.5 whitespace-nowrap ${
                    isCurrent
                      ? 'text-emerald-400 font-semibold'
                      : isCompleted
                      ? 'text-slate-300'
                      : 'text-slate-500'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Stage Fare Display (§2.3) */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60">
        {ride.status === 'REQUESTED' ? (
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Estimated fare
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">
              Estimated fare: {formatPoysha(ride.estimated_fare_poysha)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Final fare will be shown once a driver accepts.
            </div>
          </div>
        ) : ride.final_fare_poysha != null ? (
          <div>
            <div className="flex items-baseline gap-4 flex-wrap">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Estimated:</span>
                <span className="text-lg text-slate-400 line-through">
                  Estimated: {formatPoysha(ride.estimated_fare_poysha)}
                </span>
              </div>
              <div>
                <span className="text-xs text-emerald-400 block font-semibold">Final fare:</span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-extrabold text-emerald-400">
                    Final fare: {formatPoysha(ride.final_fare_poysha)}
                  </span>
                  {ride.final_fare_poysha < ride.estimated_fare_poysha && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                      Pooled discount
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-emerald-300/80 mt-2">
              Discounted because you're sharing the ride.
            </p>
          </div>
        ) : (
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Estimated fare
            </div>
            <div className="text-2xl font-bold text-slate-200 mt-1">
              {formatPoysha(ride.estimated_fare_poysha)}
            </div>
          </div>
        )}
      </div>

      {/* Co-passengers section (§7 step 6) */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Co-passengers:</span>
        <span className="text-slate-200 font-semibold">
          {coPassengers.length > 0
            ? `Riding with: ${coPassengers.map((p) => `${p.name} (${p.seats_requested} seat)`).join(', ')}`
            : 'Solo ride'}
        </span>
      </div>

      {cancelError && (
        <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs">
          {cancelError}
        </div>
      )}

      {/* Cancellation control */}
      {!isTerminal && (
        <div className="pt-2">
          {isStarted ? (
            <div className="text-center">
              <button
                type="button"
                disabled
                title="Cannot cancel once the trip has started"
                className="w-full py-2.5 px-4 bg-slate-800 border border-slate-700 text-slate-500 rounded-xl text-xs font-semibold cursor-not-allowed"
              >
                Cancel ride
              </button>
              <p className="text-[11px] text-amber-400/80 mt-1.5">
                Cannot cancel once the trip has started
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={isCancelling}
              onClick={handleCancelClick}
              className="w-full py-2.5 px-4 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCancelling ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-rose-300/30 border-t-rose-300 rounded-full animate-spin"></span>
                  <span>Cancelling request...</span>
                </>
              ) : (
                <span>Cancel ride</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
