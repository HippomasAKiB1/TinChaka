import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { validateUuidParam } from '../middleware/validateParam';
import { create, listMine, listPending, cancel, detail } from '../controllers/rideRequest.controller';

export const rideRequestRouter = Router();

// Passenger ride request creation and personal request listing
rideRequestRouter.post('/', requireAuth, requireRole('PASSENGER'), create);
rideRequestRouter.get('/me', requireAuth, requireRole('PASSENGER'), listMine);

// Driver pending requests list for a specific pickup zone
rideRequestRouter.get('/', requireAuth, requireRole('DRIVER'), listPending);

// Cancel ride request: validated UUID param; role-scoped ownership handled in service
rideRequestRouter.patch('/:id/cancel', requireAuth, validateUuidParam('id'), cancel);

// Ride request detail with full transition history: validated UUID param; role-scoped authz in service
rideRequestRouter.get('/:id', requireAuth, validateUuidParam('id'), detail);
