import { Pool, RideRequest, PoolStatus, RideRequestStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../types/AppError';
import { Zone } from '../domain/zones';
import { calculateFinalFare } from '../domain/fare';

export interface AcceptResult {
  pool: Pool & { ride_requests: RideRequest[] };
  created: boolean;
}

/**
 * §5 & §6 Step 8: Transactional ride request acceptance with row-level concurrency control.
 *
 * Concurrency notes:
 * - §5 transactional row-lock: correct but serializes writes per vehicle. At scale: optimistic concurrency
 *   with a version column or atomic counter in a fast store. Documented in README.
 * - SELECT ... FOR UPDATE must run INSIDE tx.$transaction; if it runs outside, the lock is released immediately.
 * - The re-sum MUST happen after the lock; never trust a pre-lock read of seats.
 */
export async function acceptRequest(driverId: string, rideRequestId: string): Promise<AcceptResult> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { driver_id: driverId },
  });

  if (!vehicle || !vehicle.is_online) {
    throw new AppError(409, 'Go online to accept ride requests', 'DRIVER_OFFLINE');
  }

  return await prisma.$transaction(async (tx) => {
    // a) Lock the driver's active pool row if one exists
    const activePools = await tx.$queryRaw<Array<{ id: string; vehicle_id: string; status: PoolStatus }>>`
      SELECT id, vehicle_id, status FROM pools
      WHERE vehicle_id = ${vehicle.id}::uuid
        AND status::text IN ('MATCHED', 'DRIVER_ARRIVED')
      FOR UPDATE
    `;

    let targetPoolId: string;
    let created = false;

    if (activePools.length > 0) {
      targetPoolId = activePools[0].id;
    } else {
      // Create new pool if driver has no active pool
      const newPool = await tx.pool.create({
        data: {
          vehicle_id: vehicle.id,
          status: 'MATCHED',
        },
      });
      targetPoolId = newPool.id;
      created = true;
    }

    // b) Lock the candidate ride_request row being accepted
    const lockedRequests = await tx.$queryRaw<Array<{
      id: string;
      passenger_id: string;
      pickup_zone: string;
      destination_zone: string;
      seats_requested: number;
      status: RideRequestStatus;
      pool_id: string | null;
      estimated_fare_poysha: number;
      final_fare_poysha: number | null;
    }>>`
      SELECT id, passenger_id, pickup_zone, destination_zone, seats_requested, status, pool_id, estimated_fare_poysha, final_fare_poysha
      FROM ride_requests
      WHERE id = ${rideRequestId}::uuid
      FOR UPDATE
    `;

    if (lockedRequests.length === 0) {
      throw new AppError(404, 'Ride request not found', 'NOT_FOUND');
    }

    const candidate = lockedRequests[0];

    if (candidate.status !== 'REQUESTED' || candidate.pool_id !== null) {
      throw new AppError(409, 'Request is no longer available', 'REQUEST_NOT_AVAILABLE');
    }

    // c) Verify same pickup zone against existing pool members
    const existingMembers = await tx.rideRequest.findMany({
      where: {
        pool_id: targetPoolId,
        status: { in: ['MATCHED', 'DRIVER_ARRIVED', 'STARTED'] },
      },
    });

    if (existingMembers.length > 0) {
      const poolPickupZone = existingMembers[0].pickup_zone;
      if (candidate.pickup_zone !== poolPickupZone) {
        throw new AppError(409, 'Request is in a different pickup zone', 'ZONE_MISMATCH');
      }
    }

    // d) Recompute occupied seats INSIDE THE LOCK
    const sumResult = await tx.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(seats_requested), 0)::int as total
      FROM ride_requests
      WHERE pool_id = ${targetPoolId}::uuid
        AND status::text IN ('MATCHED', 'DRIVER_ARRIVED', 'STARTED')
    `;

    const occupied = sumResult[0]?.total ?? 0;
    const newTotal = occupied + candidate.seats_requested;

    if (newTotal > vehicle.capacity) {
      throw new AppError(409, 'Not enough seats remaining', 'CAPACITY_EXCEEDED');
    }

    // e) Link the candidate request to the pool
    await tx.rideRequest.update({
      where: { id: candidate.id },
      data: {
        pool_id: targetPoolId,
        status: 'MATCHED',
      },
    });

    // f) Recompute final fare for ALL active members (§2.3 + architecture.md §6)
    const allActiveMembers = await tx.rideRequest.findMany({
      where: {
        pool_id: targetPoolId,
        status: { in: ['MATCHED', 'DRIVER_ARRIVED', 'STARTED'] },
      },
    });

    const activeMemberCount = allActiveMembers.length;

    for (const member of allActiveMembers) {
      const finalFare = calculateFinalFare(
        member.pickup_zone as Zone,
        member.destination_zone as Zone,
        activeMemberCount,
      );

      await tx.rideRequest.update({
        where: { id: member.id },
        data: {
          final_fare_poysha: finalFare,
        },
      });
    }

    // g) Insert ride_status_history audit row for the accepted request
    await tx.rideStatusHistory.create({
      data: {
        ride_request_id: candidate.id,
        from_status: 'REQUESTED',
        to_status: 'MATCHED',
        changed_by_user_id: driverId,
      },
    });

    // h) Return the pool with all member requests
    const poolWithMembers = await tx.pool.findUniqueOrThrow({
      where: { id: targetPoolId },
      include: {
        ride_requests: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return { pool: poolWithMembers, created };
  });
}
