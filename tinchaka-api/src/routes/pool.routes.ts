import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { accept } from '../controllers/pool.controller';

export const poolRouter = Router();

// Single endpoint for driver to create new pool or join existing active pool
poolRouter.post('/accept', requireAuth, requireRole('DRIVER'), accept);
