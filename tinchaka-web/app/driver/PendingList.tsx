'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Zone } from '@/lib/zones';
import { RideRequest } from '@/lib/rides';
import { getPendingRequests, acceptRequest } from '@/lib/driver';
import { formatPoysha } from '@/lib/format';

const STORY_PASSENGERS: Record<string, string> = {
  'f4ba3fe3-1360-489d-b805-48da44f17f15': 'Nusrat',
  '4789a3ba-9afb-4d20-a10e-0091bd1835c6': 'Rafiq',
  '07dfa303-5112-41dc-8287-54d9c40a868b': 'Shirin',
};

interface PendingListProps {
  zone: Zone;
  token: string;
  isOnline: boolean;
  onAccepted: () => Promise<void>;
  seatsRemaining?: number;
}

export function PendingList({
  zone,
  token,
  isOnline,
  onAccepted,
  seatsRemaining = 3,
}: PendingListProps) {
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    if (!token || !isOnline) return;
    try {
      const data = await getPendingRequests(zone, token);
      setRequests(data);
      setActionError(null);
    } catch {
      // Ignore poll error
    } finally {
      setLoading(false);
    }
  }, [zone, token, isOnline]);

  useEffect(() => {
    if (!isOnline) {
      setRequests([]);
      setLoading(false);
      return;
    }

    fetchPending();
    const interval = setInterval(fetchPending, 3000);
    return () => clearInterval(interval);
  }, [isOnline, fetchPending]);

  const handleAccept = async (requestId: string) => {
    if (acceptingId) return;
    setAcceptingId(requestId);
    setActionError(null);
    try {
      await acceptRequest(requestId, token);
      await onAccepted();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('Failed to accept ride request');
      }
    } finally {
      setAcceptingId(null);
    }
  };

  const getPassengerName = (req: RideRequest): string => {
    if (STORY_PASSENGERS[req.passenger_id]) {
      return STORY_PASSENGERS[req.passenger_id];
    }
    return `Passenger #${req.passenger_id.slice(0, 6)}`;
  };

  return (
    <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            Pending Requests in {zone}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isOnline
              ? `${requests.length} ${requests.length === 1 ? 'passenger' : 'passengers'} waiting for a pool`
              : 'Go online to receive passenger requests'}
          </p>
        </div>
        {isOnline && (
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live radar
          </span>
        )}
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs">
          {actionError}
        </div>
      )}

      {!isOnline ? (
        <div className="py-10 text-center text-slate-400 text-xs border border-dashed border-slate-700/60 rounded-xl">
          You are offline. Switch the toggle above to go online.
        </div>
      ) : loading && requests.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
          <span className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <span>Scanning for ride requests in {zone}...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs border border-dashed border-slate-700/60 rounded-xl">
          No pending requests in {zone}. Waiting for riders...
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const canFit = req.seats_requested <= seatsRemaining;
            const passengerName = getPassengerName(req);

            return (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-slate-600"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">
                      {req.pickup_zone} → {req.destination_zone}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {req.seats_requested} {req.seats_requested === 1 ? 'Seat' : 'Seats'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Requested by <strong className="text-slate-200">{passengerName}</strong> · Estimate:{' '}
                    <span className="text-emerald-400 font-semibold">
                      {formatPoysha(req.estimated_fare_poysha)}
                    </span>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={!canFit || acceptingId === req.id}
                    onClick={() => handleAccept(req.id)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700 text-white font-medium text-xs transition shadow-sm flex items-center justify-center gap-2"
                  >
                    {acceptingId === req.id ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Accepting...</span>
                      </>
                    ) : !canFit ? (
                      <span>Not enough seats</span>
                    ) : (
                      <span>Accept & pool</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
