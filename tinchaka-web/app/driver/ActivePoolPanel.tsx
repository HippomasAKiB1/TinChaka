'use client';

import React, { useState } from 'react';
import { Pool, PoolStatus, markArrived, markStarted, markCompleted, cancelPool } from '@/lib/driver';
import { formatPoysha } from '@/lib/format';

const STORY_PASSENGERS: Record<string, string> = {
  'f4ba3fe3-1360-489d-b805-48da44f17f15': 'Nusrat',
  '4789a3ba-9afb-4d20-a10e-0091bd1835c6': 'Rafiq',
  '07dfa303-5112-41dc-8287-54d9c40a868b': 'Shirin',
};

interface ActivePoolPanelProps {
  pool: Pool;
  token: string;
  onUpdated: () => Promise<void>;
}

const POOL_STAGES: { key: PoolStatus; label: string }[] = [
  { key: 'MATCHED', label: 'Matched' },
  { key: 'DRIVER_ARRIVED', label: 'Arrived' },
  { key: 'STARTED', label: 'Started' },
  { key: 'COMPLETED', label: 'Completed' },
];

export function ActivePoolPanel({ pool, token, onUpdated }: ActivePoolPanelProps) {
  const [inFlightAction, setInFlightAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeMembers = pool.ride_requests.filter((r) => r.status !== 'CANCELLED');
  const seatsOccupied = activeMembers.reduce((sum, r) => sum + r.seats_requested, 0);

  const currentStageIndex = POOL_STAGES.findIndex((s) => s.key === pool.status);
  const isStarted = pool.status === 'STARTED';
  const isTerminal = pool.status === 'COMPLETED' || pool.status === 'CANCELLED';

  const handleAction = async (actionType: 'arrived' | 'start' | 'complete' | 'cancel') => {
    if (inFlightAction) return;
    setInFlightAction(actionType);
    setError(null);

    try {
      if (actionType === 'arrived') {
        await markArrived(pool.id, token);
      } else if (actionType === 'start') {
        await markStarted(pool.id, token);
      } else if (actionType === 'complete') {
        await markCompleted(pool.id, token);
      } else if (actionType === 'cancel') {
        await cancelPool(pool.id, token);
      }
      await onUpdated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update pool state');
      }
    } finally {
      setInFlightAction(null);
    }
  };

  const getPassengerName = (passengerId: string): string => {
    if (STORY_PASSENGERS[passengerId]) {
      return STORY_PASSENGERS[passengerId];
    }
    return `Passenger #${passengerId.slice(0, 6)}`;
  };

  return (
    <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-sm space-y-6">
      {/* Header with status and capacity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Active Vehicle Pool
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
              {pool.status.replace('_', ' ')}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Seats: {seatsOccupied} / 3 (Bullet)
          </h2>
        </div>

        {pool.status === 'MATCHED' && seatsOccupied < 3 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Waiting for more riders ({3 - seatsOccupied} seats open)</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Visual Stepper */}
      <div className="py-2">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-700 -z-0" />
          {POOL_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage.key} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-900 ring-4 ring-slate-800'
                      : isCurrent
                      ? 'bg-amber-400 text-slate-900 ring-4 ring-amber-500/40 animate-pulse'
                      : 'bg-slate-700 text-slate-400 ring-4 ring-slate-800'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-[11px] font-medium mt-1.5 whitespace-nowrap ${
                    isCurrent
                      ? 'text-amber-400 font-semibold'
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

      {/* Pool Members List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Riders in Pool ({activeMembers.length})
        </h3>
        <div className="space-y-2.5">
          {activeMembers.map((member) => {
            const name = getPassengerName(member.passenger_id);
            const farePoysha = member.final_fare_poysha ?? member.estimated_fare_poysha;

            return (
              <div
                key={member.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{name}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-300 font-medium">
                      {member.pickup_zone} → {member.destination_zone}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    {member.seats_requested} {member.seats_requested === 1 ? 'seat' : 'seats'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-sm text-emerald-400">
                    {formatPoysha(farePoysha)}
                  </div>
                  {member.final_fare_poysha &&
                    member.final_fare_poysha < member.estimated_fare_poysha && (
                      <div className="text-[10px] text-emerald-300/80 font-medium">
                        20% pool discount
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trip Lifecycle Controls */}
      {!isTerminal && (
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {pool.status === 'MATCHED' && (
            <button
              type="button"
              disabled={Boolean(inFlightAction)}
              onClick={() => handleAction('arrived')}
              className="flex-1 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
            >
              {inFlightAction === 'arrived' ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Mark arrived at pickup</span>
              )}
            </button>
          )}

          {pool.status === 'DRIVER_ARRIVED' && (
            <button
              type="button"
              disabled={Boolean(inFlightAction)}
              onClick={() => handleAction('start')}
              className="flex-1 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
            >
              {inFlightAction === 'start' ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Starting trip...</span>
                </>
              ) : (
                <span>Start trip (all riders boarded)</span>
              )}
            </button>
          )}

          {pool.status === 'STARTED' && (
            <button
              type="button"
              disabled={Boolean(inFlightAction)}
              onClick={() => handleAction('complete')}
              className="flex-1 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
            >
              {inFlightAction === 'complete' ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Completing...</span>
                </>
              ) : (
                <span>Complete trip & collect cash fares</span>
              )}
            </button>
          )}

          {!isStarted && (
            <button
              type="button"
              disabled={Boolean(inFlightAction)}
              onClick={() => handleAction('cancel')}
              className="w-full sm:w-auto py-3 px-4 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {inFlightAction === 'cancel' ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-rose-300/30 border-t-rose-300 rounded-full animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Cancel pool</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
