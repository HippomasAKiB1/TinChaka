import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { create, listMine, listPending } from '../controllers/rideRequest.controller';

export const rideRequestRouter = Router();

// Passenger ride request creation and personal request listing
rideRequestRouter.post('/', requireAuth, requireRole('PASSENGER'), create);
rideRequestRouter.get('/me', requireAuth, requireRole('PASSENGER'), listMine);

// Driver pending requests list for a specific pickup zone
rideRequestRouter.get('/', requireAuth, requireRole('DRIVER'), listPending);

