import { apiFetch } from './api';
import { Zone } from './zones';

export type RideStatus =
  | 'REQUESTED'
  | 'MATCHED'
  | 'DRIVER_ARRIVED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PoolMember {
  id: string;
  name: string;
  seats_requested: number;
}

export interface RideRequest {
  id: string;
  passenger_id: string;
  pickup_zone: string;
  destination_zone: string;
  seats_requested: number;
  status: RideStatus;
  pool_id: string | null;
  estimated_fare_poysha: number;
  final_fare_poysha: number | null;
  created_at: string;
  updated_at: string;
}

export interface RideRequestWithPool extends RideRequest {
  pool_members: PoolMember[] | null;
}

export interface CreateRideInput {
  pickup_zone: Zone;
  destination_zone: Zone;
  seats_requested: number;
}

export async function createRide(
  input: CreateRideInput,
  token: string
): Promise<RideRequest> {
  const data = await apiFetch<{ ride_request: RideRequest }>('/ride-requests', {
    method: 'POST',
    body: input,
    token,
  });
  return data.ride_request;
}

export async function listMyRides(
  token: string
): Promise<RideRequestWithPool[]> {
  const data = await apiFetch<{ ride_requests: RideRequestWithPool[] }>('/ride-requests/me', {
    method: 'GET',
    token,
  });
  return data.ride_requests;
}

export async function cancelRide(
  id: string,
  token: string
): Promise<RideRequest> {
  const data = await apiFetch<{ ride_request: RideRequest }>(`/ride-requests/${id}/cancel`, {
    method: 'PATCH',
    token,
  });
  return data.ride_request;
}
