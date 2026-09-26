import { RideRequest, RideStatusHistory } from '@prisma/client';
import { prisma } from '../config/db';
import { Zone } from '../domain/zones';
import { estimateSoloFare, calculateFinalFare } from '../domain/fare';
import { AppError } from '../types/AppError';
import { assertRideRequestTransition } from '../domain/stateMachine';

export interface CreateRideRequestParams {
  passengerId: string;
  pickup_zone: Zone;
  destination_zone: Zone;
  seats_requested: number;
}

// Creates ride request and writes initial audit history row in a single atomic transaction
export async function createRideRequest(input: CreateRideRequestParams): Promise<RideRequest> {
  const estimated = estimateSoloFare(input.pickup_zone, input.destination_zone);

  return await prisma.$transaction(async (tx) => {
    const createdRequest = await tx.rideRequest.create({
      data: {
        passenger_id: input.passengerId,
        pickup_zone: input.pickup_zone,
        destination_zone: input.destination_zone,
        seats_requested: input.seats_requested,
        status: 'REQUESTED',
        pool_id: null,
        estimated_fare_poysha: estimated,
        final_fare_poysha: null,
      },
    });

    // Write initial audit row (from_status=null, to_status=REQUESTED) per docs/architecture.md §6
    await tx.rideStatusHistory.create({
      data: {
        ride_request_id: createdRequest.id,
        from_status: null,
        to_status: 'REQUESTED',
        changed_by_user_id: input.passengerId,
      },
    });

    return createdRequest;
  });
}

export interface PoolMemberSummary {
  id: string;
  name: string;
  seats_requested: number;
}

export type PassengerRideRequestWithPool = RideRequest & {
  pool_members: PoolMemberSummary[] | null;
};

// Lists passenger ride requests with co-passenger visibility without leaking fares per §7 step 6
export async function listPassengerRideRequestsWithPool(
  passengerId: string
): Promise<PassengerRideRequestWithPool[]> {
  const rides = await prisma.rideRequest.findMany({
    where: {
      passenger_id: passengerId,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  const result: PassengerRideRequestWithPool[] = [];

  for (const ride of rides) {
    if (!ride.pool_id) {
      result.push({
        ...ride,
        pool_members: null,
      });
    } else {
      const members = await prisma.rideRequest.findMany({
        where: {
          pool_id: ride.pool_id,
          status: { not: 'CANCELLED' },
        },
        include: {
          passenger: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      const poolMembers: PoolMemberSummary[] = members.map((m) => ({
        id: m.id,
        name: m.passenger.name,
        seats_requested: m.seats_requested,
      }));

      result.push({
        ...ride,
        pool_members: poolMembers,
      });
    }
  }

  return result;
}

// Lists passenger ride requests ordered by creation time descending
export async function listPassengerRideRequests(passengerId: string): Promise<RideRequest[]> {
  return await prisma.rideRequest.findMany({
    where: {
      passenger_id: passengerId,
    },
    orderBy: {
      created_at: 'desc',
    },
  });
}

// Lists pending ride requests in driver's pickup zone; checks that driver's vehicle is online
export async function listPendingInZone(driverId: string, zone: Zone): Promise<RideRequest[]> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { driver_id: driverId },
  });

  if (!vehicle || !vehicle.is_online) {
    throw new AppError(409, 'Go online to see pending requests', 'DRIVER_OFFLINE');
  }

  return await prisma.rideRequest.findMany({
    where: {
      status: 'REQUESTED',
      pool_id: null,
      pickup_zone: zone,
    },
    orderBy: {
      created_at: 'asc',
    },
  });
}

// Cancels individual ride request and rebalances remaining pool members per architecture.md §6
export async function cancelRideRequest(
  userId: string,
  userRole: 'PASSENGER' | 'DRIVER',
  rideRequestId: string,
): Promise<RideRequest> {
  return await prisma.$transaction(async (tx) => {
    // a) Look up the ride request with pool and vehicle relationships
    const rideRequest = await tx.rideRequest.findUnique({
      where: { id: rideRequestId },
      include: {
        pool: {
          include: {
            vehicle: true,
          },
        },
      },
    });

    if (!rideRequest) {
      throw new AppError(404, 'Ride request not found', 'NOT_FOUND');
    }

    // b) Authorization verification: passengers own request, drivers own pool vehicle
    if (userRole === 'PASSENGER') {
      if (rideRequest.passenger_id !== userId) {
        throw new AppError(403, 'Forbidden', 'FORBIDDEN');
      }
    } else if (userRole === 'DRIVER') {
      if (!rideRequest.pool || rideRequest.pool.vehicle.driver_id !== userId) {
        throw new AppError(403, 'Forbidden', 'FORBIDDEN');
      }
    }

    // c) Enforce state machine transition; blocks cancellation after STARTED (§9 test 6)
    assertRideRequestTransition(rideRequest.status, 'CANCELLED');

    // d) Update ride_requests status to CANCELLED
    await tx.rideRequest.update({
      where: { id: rideRequestId },
      data: { status: 'CANCELLED' },
    });

    // e) Record state transition in audit trail
    await tx.rideStatusHistory.create({
      data: {
        ride_request_id: rideRequestId,
        from_status: rideRequest.status,
        to_status: 'CANCELLED',
        changed_by_user_id: userId,
      },
    });

    // f) Handle remaining pool members and fare rebalancing
    if (rideRequest.pool_id) {
      const targetPoolId = rideRequest.pool_id;
      const remainingMembers = await tx.rideRequest.findMany({
        where: {
          pool_id: targetPoolId,
          status: { in: ['MATCHED', 'DRIVER_ARRIVED', 'STARTED'] },
          id: { not: rideRequestId },
        },
      });

      if (remainingMembers.length === 0) {
        // If no active members remain, cancel the pool aggregate
        await tx.pool.update({
          where: { id: targetPoolId },
          data: { status: 'CANCELLED' },
        });
      } else if (remainingMembers.length === 1) {
        // If exactly 1 member remains, revert to solo estimate (fare changes are NOT status changes — no history row written)
        const soloMember = remainingMembers[0];
        await tx.rideRequest.update({
          where: { id: soloMember.id },
          data: {
            final_fare_poysha: soloMember.estimated_fare_poysha,
          },
        });
      } else {
        // If 2+ members remain, recompute final fare with 20% discount (fare changes are NOT status changes — no history row written)
        for (const member of remainingMembers) {
          const finalFare = calculateFinalFare(
            member.pickup_zone as Zone,
            member.destination_zone as Zone,
            remainingMembers.length,
          );
          await tx.rideRequest.update({
            where: { id: member.id },
            data: { final_fare_poysha: finalFare },
          });
        }
      }
    }

    // g) Return the updated (cancelled) ride request
    return await tx.rideRequest.findUniqueOrThrow({
      where: { id: rideRequestId },
    });
  });
}

// Fetches ride request details with audit history; enforces role-scoped cross-user ownership per PROJECT_PLAN.md §6 step 5
export async function getRideRequestForUser(
  userId: string,
  userRole: 'PASSENGER' | 'DRIVER',
  rideRequestId: string,
): Promise<RideRequest & { ride_status_history: RideStatusHistory[] }> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(rideRequestId)) {
    throw new AppError(404, 'Ride request not found', 'NOT_FOUND');
  }

  const rideRequest = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    include: {
      ride_status_history: {
        orderBy: { changed_at: 'asc' },
      },
      pool: {
        include: {
          vehicle: true,
        },
      },
    },
  });

  if (!rideRequest) {
    throw new AppError(404, 'Ride request not found', 'NOT_FOUND');
  }

  // Enforce role-scoped authorization: passenger owns request, driver owns pool vehicle
  if (userRole === 'PASSENGER') {
    if (rideRequest.passenger_id !== userId) {
      throw new AppError(403, 'Forbidden: You do not own this ride request', 'FORBIDDEN');
    }
  } else if (userRole === 'DRIVER') {
    if (!rideRequest.pool || rideRequest.pool.vehicle.driver_id !== userId) {
      throw new AppError(403, 'Forbidden: Ride request is not in your vehicle pool', 'FORBIDDEN');
    }
  }

  const { pool: _pool, ...result } = rideRequest;
  return result;
}
