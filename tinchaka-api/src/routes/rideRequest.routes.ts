import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { create, listMine, listPending, cancel } from '../controllers/rideRequest.controller';

export const rideRequestRouter = Router();

// Passenger ride request creation and personal request listing
rideRequestRouter.post('/', requireAuth, requireRole('PASSENGER'), create);
rideRequestRouter.get('/me', requireAuth, requireRole('PASSENGER'), listMine);

// Driver pending requests list for a specific pickup zone
rideRequestRouter.get('/', requireAuth, requireRole('DRIVER'), listPending);

// Cancel ride request: no requireRole because both passenger and driver can cancel per architecture.md §6; service validates ownership
rideRequestRouter.patch('/:id/cancel', requireAuth, cancel);
