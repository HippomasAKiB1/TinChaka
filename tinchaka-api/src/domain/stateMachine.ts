import { RideRequestStatus, PoolStatus } from '@prisma/client';
import { AppError } from '../types/AppError';

// Ride request transitions per §2.1
// REQUESTED → MATCHED → DRIVER_ARRIVED → STARTED → COMPLETED
// CANCELLED allowed from REQUESTED, MATCHED, DRIVER_ARRIVED only
const RIDE_REQUEST_TRANSITIONS: Record<RideRequestStatus, RideRequestStatus[]> = {
  REQUESTED: ['MATCHED', 'CANCELLED'],
  MATCHED: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['STARTED', 'CANCELLED'],
  STARTED: ['COMPLETED'], // no cancel
  COMPLETED: [],
  CANCELLED: [],
};

const POOL_TRANSITIONS: Record<PoolStatus, PoolStatus[]> = {
  MATCHED: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['STARTED', 'CANCELLED'],
  STARTED: ['COMPLETED'], // no cancel
  COMPLETED: [],
  CANCELLED: [],
};

// Per PROJECT_PLAN.md §2.1 — this is the only place transition legality is decided.
export function assertRideRequestTransition(from: RideRequestStatus, to: RideRequestStatus): void {
  const allowed = RIDE_REQUEST_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new AppError(409, `Cannot transition from ${from} to ${to}`, 'INVALID_TRANSITION');
  }
}

// Per PROJECT_PLAN.md §2.1 — this is the only place transition legality is decided.
export function assertPoolTransition(from: PoolStatus, to: PoolStatus): void {
  const allowed = POOL_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new AppError(409, `Cannot transition from ${from} to ${to}`, 'INVALID_TRANSITION');
  }
}
