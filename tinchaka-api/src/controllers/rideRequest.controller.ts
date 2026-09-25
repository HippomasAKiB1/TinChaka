import { Request, Response, NextFunction } from 'express';
import { createRideRequestSchema } from '../schemas/rideRequest.schema';
import { createRideRequest, listPassengerRideRequests } from '../services/rideRequest.service';

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
    const rideRequests = await listPassengerRideRequests(req.user!.id);
    res.status(200).json({ ride_requests: rideRequests });
  } catch (err) {
    next(err);
  }
}
