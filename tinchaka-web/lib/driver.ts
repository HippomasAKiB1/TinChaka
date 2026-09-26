import { apiFetch } from './api';
import { Zone } from './zones';
import { RideRequest } from './rides';

export interface Vehicle {
  id: string;
  driver_id: string;
  model: string;
  plate_number: string;
  capacity: number;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export type PoolStatus =
  | 'MATCHED'
  | 'DRIVER_ARRIVED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Pool {
  id: string;
  vehicle_id: string;
  status: PoolStatus;
  created_at: string;
  completed_at: string | null;
  ride_requests: RideRequest[];
}

export async function setOnline(isOnline: boolean, token: string): Promise<Vehicle> {
  const data = await apiFetch<{ vehicle: Vehicle }>('/vehicles/me/online', {
    method: 'PATCH',
    body: { is_online: isOnline },
    token,
  });
  return data.vehicle;
}

export async function getActivePool(token: string): Promise<Pool | null> {
  const data = await apiFetch<{ pool: Pool | null }>('/pools/me/active', {
    method: 'GET',
    token,
  });
  return data.pool;
}

export async function getPendingRequests(zone: Zone, token: string): Promise<RideRequest[]> {
  const data = await apiFetch<{ ride_requests: RideRequest[] }>(
    `/ride-requests?zone=${encodeURIComponent(zone)}`,
    {
      method: 'GET',
      token,
    }
  );
  return data.ride_requests;
}

export async function acceptRequest(
  rideRequestId: string,
  token: string
): Promise<{ pool: Pool; created: boolean }> {
  const data = await apiFetch<{ pool: Pool; created: boolean }>('/pools/accept', {
    method: 'POST',
    body: { ride_request_id: rideRequestId },
    token,
  });
  return data;
}

export async function markArrived(poolId: string, token: string): Promise<Pool> {
  const data = await apiFetch<{ pool: Pool }>(`/pools/${poolId}/arrived`, {
    method: 'PATCH',
    token,
  });
  return data.pool;
}

export async function markStarted(poolId: string, token: string): Promise<Pool> {
  const data = await apiFetch<{ pool: Pool }>(`/pools/${poolId}/start`, {
    method: 'PATCH',
    token,
  });
  return data.pool;
}

export async function markCompleted(poolId: string, token: string): Promise<Pool> {
  const data = await apiFetch<{ pool: Pool }>(`/pools/${poolId}/complete`, {
    method: 'PATCH',
    token,
  });
  return data.pool;
}

export async function cancelPool(poolId: string, token: string): Promise<Pool> {
  const data = await apiFetch<{ pool: Pool }>(`/pools/${poolId}/cancel`, {
    method: 'PATCH',
    token,
  });
  return data.pool;
}

export async function getDriverHistory(token: string): Promise<Pool[]> {
  const data = await apiFetch<{ pools: Pool[] }>('/pools/me/history', {
    method: 'GET',
    token,
  });
  return data.pools;
}
