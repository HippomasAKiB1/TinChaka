import express, { Application, Request, Response } from 'express';
import { requestLogger } from './middleware/requestLogger';
import { authRouter } from './routes/auth.routes';
import { rideRequestRouter } from './routes/rideRequest.routes';
import { vehicleRouter } from './routes/vehicle.routes';
import { poolRouter } from './routes/pool.routes';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): Application => {
  const app = express();

  // Request logging middleware tracking latency and actor identity per PROJECT_PLAN.md §6 step 11
  app.use(requestLogger);

  // Core parsing middleware
  app.use(express.json());

  // Health check endpoint (for Docker & load balancer probes)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Mount auth routes
  app.use('/auth', authRouter);

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
