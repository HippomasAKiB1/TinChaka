'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { listMyRides, cancelRide, RideRequestWithPool } from '@/lib/rides';
import { RequestForm } from './RequestForm';
import { ActiveRide } from './ActiveRide';
import { HistoryList } from './HistoryList';

export default function PassengerDashboardPage() {
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuth();

  const [rides, setRides] = useState<RideRequestWithPool[]>([]);
  const [loadingRides, setLoadingRides] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/login');
    }
  }, [authLoading, session, router]);

  // Load user's rides
  const fetchRides = useCallback(async () => {
    if (!session?.token) return;
    try {
      const data = await listMyRides(session.token);
      setRides(data);
      setFetchError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFetchError(err.message);
      } else {
        setFetchError('Failed to fetch rides');
      }
    } finally {
      setLoadingRides(false);
    }
  }, [session?.token]);

  useEffect(() => {
    if (session?.token && session.user.role === 'PASSENGER') {
      fetchRides();
    }
  }, [session?.token, session?.user.role, fetchRides]);

  // Find currently active ride (if any)
  const activeRide = rides.find((r) =>
    ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED'].includes(r.status)
  );

  // 3s poll is fine for MVP; WebSocket lands if this ever scales.
  useEffect(() => {
    if (!session?.token || !activeRide) return;

    const interval = setInterval(() => {
      fetchRides();
    }, 3000);

    return () => clearInterval(interval);
  }, [session?.token, activeRide?.id, activeRide?.status, fetchRides]);

  const handleCancelRide = async (rideId: string) => {
    if (!session?.token) return;
    await cancelRide(rideId, session.token);
    await fetchRides();
  };

  if (authLoading || (session && loadingRides && rides.length === 0)) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-400 text-sm">
          <span className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin"></span>
          <span>Loading passenger dashboard...</span>
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  if (session.user.role !== 'PASSENGER') {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-xl">
          <h1 className="text-xl font-bold text-slate-100">Driver Account Detected</h1>
          <p className="text-sm text-slate-400 mt-2">
            This page is for passengers. Please head over to your driver portal to view active pools.
          </p>
          <div className="mt-6">
            <Link
              href="/driver"
              className="inline-flex py-2.5 px-5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl text-sm transition-colors"
            >
              Go to Driver Dashboard →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Passenger Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Welcome, {session.user.name} · Dhaka Core Ride Pooling
          </p>
        </div>
      </div>

      {fetchError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => fetchRides()}
            className="underline hover:text-white ml-3"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ride Request Form */}
        <div className="lg:col-span-5">
          <RequestForm
            token={session.token}
            hasActiveRide={Boolean(activeRide)}
            onCreated={fetchRides}
          />
        </div>

        {/* Right Column: Active Ride Stepper + Fare Card + History */}
        <div className="lg:col-span-7 space-y-6">
          {activeRide ? (
            <ActiveRide
              ride={activeRide}
              currentUserId={session.user.id}
              onCancel={handleCancelRide}
            />
          ) : (
            <div className="p-8 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-center">
              <span className="text-3xl">🚖</span>
              <h2 className="text-base font-bold text-slate-200 mt-2">Ready to travel?</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Request a ride on the left to match with an auto-rickshaw pool in your zone.
              </p>
            </div>
          )}

          <HistoryList rides={rides} />
        </div>
      </div>
    </main>
  );
}
