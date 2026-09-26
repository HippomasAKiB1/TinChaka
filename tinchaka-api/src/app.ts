import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { authLimiter } from './middleware/rateLimit';
import { authRouter } from './routes/auth.routes';
import { rideRequestRouter } from './routes/rideRequest.routes';
import { vehicleRouter } from './routes/vehicle.routes';
import { poolRouter } from './routes/pool.routes';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';

import { prisma } from './config/db';

export const createApp = (): Application => {
  const app = express();

  // Request logging middleware tracking latency and actor identity per PROJECT_PLAN.md §6 step 11
  app.use(requestLogger);

  // Allow browser calls from the Next.js frontend (localhost:3000 → localhost:3001). Wide-open for MVP; tighten with an origin allowlist at deployment.
  app.use(cors());

  // Core parsing middleware
  app.use(express.json());

  // Health check endpoint reporting DB reachability for Docker & load balancer probes
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ok', db: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  // §6 step 11: rate limit /auth/* minimally (10 attempts per 15 min per IP)
  app.use('/auth', authLimiter, authRouter);

  // Mount passenger ride request routes
  app.use('/ride-requests', rideRequestRouter);

  // Mount driver vehicle routes
  app.use('/vehicles', vehicleRouter);

  // Mount pool routes
  app.use('/pools', poolRouter);

  // Catch-all 404 for unmatched routes
  app.use(notFoundHandler);

  // Central error handling middleware (must be registered last)
  app.use(errorHandler);

  return app;
};

export const app = createApp();
