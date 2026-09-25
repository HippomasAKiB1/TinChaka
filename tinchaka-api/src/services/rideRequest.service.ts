import { RideRequest } from '@prisma/client';
import { prisma } from '../config/db';
import { Zone } from '../domain/zones';
import { estimateSoloFare } from '../domain/fare';

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
