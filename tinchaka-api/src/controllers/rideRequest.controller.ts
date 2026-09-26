import { Request, Response, NextFunction } from 'express';
import { createRideRequestSchema, pendingInZoneQuerySchema } from '../schemas/rideRequest.schema';
import {
  createRideRequest,
  listPassengerRideRequestsWithPool,
  listPendingInZone,
  cancelRideRequest,
  getRideRequestForUser,
} from '../services/rideRequest.service';
import { isZone } from '../domain/zones';
import { AppError } from '../types/AppError';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createRideRequestSchema.parse(req.body);
    const rideRequest = await createRideRequest({
      passengerId: req.user!.id,
      pickup_zone: validated.pickup_zone,
      destination_zone: validated.destination_zone,
      seats_requested: validated.seats_requested,
    });
    res.status(201).json({ ride_request: rideRequest });
  } catch (err) {
    next(err);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rideRequests = await listPassengerRideRequestsWithPool(req.user!.id);
    res.status(200).json({ ride_requests: rideRequests });
  } catch (err) {
    next(err);
  }
}

// Lists pending ride requests in a specific zone for drivers
export async function listPending(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = pendingInZoneQuerySchema.parse(req.query);
    const rideRequests = await listPendingInZone(req.user!.id, validated.zone);
    res.status(200).json({ ride_requests: rideRequests });
  } catch (err) {
    next(err);
  }
}

// Cancels individual ride request; callable by passenger (owner) or driver (via pool vehicle)
export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rideRequest = await cancelRideRequest(req.user!.id, req.user!.role, req.params.id);
    res.status(200).json({ ride_request: rideRequest });
  } catch (err) {
    next(err);
  }
}

// Fetches single ride request detail with full transition audit history
export async function detail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rideRequest = await getRideRequestForUser(req.user!.id, req.user!.role, req.params.id);
    res.status(200).json({ ride_request: rideRequest });
  } catch (err) {
    next(err);
  }
}
