import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { accept, arrived, start, complete, cancel, active, history } from '../controllers/pool.controller';

export const poolRouter = Router();

// Single endpoint for driver to create new pool or join existing active pool
poolRouter.post('/accept', requireAuth, requireRole('DRIVER'), accept);

// Static /me/* routes must be registered before parameterized /:id/* routes to prevent Express matching "me" as an :id parameter
poolRouter.get('/me/active', requireAuth, requireRole('DRIVER'), active);
poolRouter.get('/me/history', requireAuth, requireRole('DRIVER'), history);

// Driver pool lifecycle transitions per PROJECT_PLAN.md §2.1 and §6 Step 9
poolRouter.patch('/:id/arrived', requireAuth, requireRole('DRIVER'), arrived);
poolRouter.patch('/:id/start', requireAuth, requireRole('DRIVER'), start);
poolRouter.patch('/:id/complete', requireAuth, requireRole('DRIVER'), complete);
poolRouter.patch('/:id/cancel', requireAuth, requireRole('DRIVER'), cancel);
