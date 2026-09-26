'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Zone } from '@/lib/zones';
import { Pool, getActivePool, getDriverHistory } from '@/lib/driver';
import { OnlineToggle } from './OnlineToggle';
import { ZonePicker } from './ZonePicker';
import { PendingList } from './PendingList';
import { ActivePoolPanel } from './ActivePoolPanel';
import { DriverHistory } from './DriverHistory';

export default function DriverDashboardPage() {
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuth();

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [currentZone, setCurrentZone] = useState<Zone>('Banani');
  const [activePool, setActivePool] = useState<Pool | null>(null);
  const [history, setHistory] = useState<Pool[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/login');
    }
  }, [authLoading, session, router]);

  const refreshData = useCallback(async () => {
    if (!session?.token || session.user.role !== 'DRIVER') return;
    try {
      const [poolData, historyData] = await Promise.all([
        getActivePool(session.token),
        getDriverHistory(session.token),
      ]);
      setActivePool(poolData);
      setHistory(historyData);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoadingInitial(false);
    }
  }, [session?.token, session?.user.role]);

  useEffect(() => {
    if (session?.token && session.user.role === 'DRIVER') {
      refreshData();
    }
  }, [session?.token, session?.user.role, refreshData]);

  // Polling active pool every 3000ms while active
  useEffect(() => {
    if (!session?.token) return;
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [session?.token, refreshData]);

  if (authLoading || (session && loadingInitial)) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-400 text-sm">
          <span className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
          <span>Loading driver dashboard...</span>
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  if (session.user.role !== 'DRIVER') {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-xl">
          <h1 className="text-xl font-bold text-slate-100">Passenger Account Detected</h1>
          <p className="text-sm text-slate-400 mt-2">
            This page is for drivers only. Please navigate to the passenger dashboard to book rides.
          </p>
          <div className="mt-6">
            <Link
              href="/passenger"
              className="inline-flex py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-colors"
            >
              Go to Passenger Dashboard →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const activeMembers = activePool?.ride_requests.filter((r) => r.status !== 'CANCELLED') || [];
  const seatsOccupied = activeMembers.reduce((sum, r) => sum + r.seats_requested, 0);
  const seatsRemaining = Math.max(0, 3 - seatsOccupied);

  // Pending list is shown if no active pool exists OR if active pool is at MATCHED with seats open
  const showPendingList =
    !activePool || (activePool.status === 'MATCHED' && seatsRemaining > 0);

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header and Zone Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Driver Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Captain {session.user.name} · Vehicle: Bullet (Capacity 3)
          </p>
        </div>

        <ZonePicker currentZone={currentZone} onZoneChange={setCurrentZone} />
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Online / Offline Status Toggle */}
      <OnlineToggle
        isOnline={isOnline}
        token={session.token}
        onToggle={setIsOnline}
      />

      {/* Active Pool Panel (if active pool exists) */}
      {activePool && (
        <ActivePoolPanel
          pool={activePool}
          token={session.token}
          onUpdated={refreshData}
        />
      )}

      {/* Pending Requests List */}
      {showPendingList && (
        <PendingList
          zone={currentZone}
          token={session.token}
          isOnline={isOnline}
          onAccepted={refreshData}
          seatsRemaining={seatsRemaining}
        />
      )}

      {/* Driver Trip History */}
      <DriverHistory history={history} />
    </main>
  );
}
