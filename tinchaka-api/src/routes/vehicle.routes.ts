import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { patchMeOnline } from '../controllers/vehicle.controller';

export const vehicleRouter = Router();

// Driver vehicle online/availability status route
vehicleRouter.patch('/me/online', requireAuth, requireRole('DRIVER'), patchMeOnline);
