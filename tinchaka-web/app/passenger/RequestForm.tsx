'use client';

import React, { useState } from 'react';
import { ZONES, Zone } from '@/lib/zones';
import { createRide } from '@/lib/rides';
import { ApiError } from '@/lib/api';

interface RequestFormProps {
  token: string;
  hasActiveRide: boolean;
  onCreated: () => void;
}

export function RequestForm({ token, hasActiveRide, onCreated }: RequestFormProps) {
  const [pickupZone, setPickupZone] = useState<Zone>('Banani');
  const [destinationZone, setDestinationZone] = useState<Zone>('Mohakhali');
  const [seatsRequested, setSeatsRequested] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pickupZone === destinationZone) {
      setError('Pickup and destination zones must be different');
      return;
    }

    if (seatsRequested < 1 || seatsRequested > 3) {
      setError('Seats requested must be between 1 and 3');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRide(
        {
          pickup_zone: pickupZone,
          destination_zone: destinationZone,
          seats_requested: seatsRequested,
        },
        token
      );
      onCreated();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create ride request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-sm">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-100">Request a Ride</h2>
        <p className="text-xs text-slate-400 mt-1">
          Select your route to pool with passengers traveling the same way
        </p>
      </div>

      {hasActiveRide && (
        <div className="mb-5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2">
          <span className="font-bold">⚠️</span>
          <span>You have an active ride in progress. Complete or cancel it to request another ride.</span>
        </div>
      )}

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
          <span className="font-bold">✕</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="pickup_zone"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
          >
            Pickup Zone
          </label>
          <select
            id="pickup_zone"
            disabled={hasActiveRide || isSubmitting}
            value={pickupZone}
            onChange={(e) => setPickupZone(e.target.value as Zone)}
            className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="destination_zone"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
          >
            Destination Zone
          </label>
          <select
            id="destination_zone"
            disabled={hasActiveRide || isSubmitting}
            value={destinationZone}
            onChange={(e) => setDestinationZone(e.target.value as Zone)}
            className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Seats Needed
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                disabled={hasActiveRide || isSubmitting}
                onClick={() => setSeatsRequested(num)}
                className={`py-2 px-3 rounded-lg border text-sm font-semibold transition ${
                  seatsRequested === num
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                    : 'border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {num} {num === 1 ? 'Seat' : 'Seats'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={hasActiveRide || isSubmitting}
          className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:border disabled:border-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Requesting ride...</span>
            </>
          ) : (
            <span>Request ride</span>
          )}
        </button>
      </form>
    </div>
  );
}
