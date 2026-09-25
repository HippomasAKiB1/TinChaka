import express, { Application, Request, Response } from 'express';
import { authRouter } from './routes/auth.routes';
import { rideRequestRouter } from './routes/rideRequest.routes';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): Application => {
  const app = express();

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

  // TODO(step-6): mount requireOwnership middleware on ride resources
  // TODO(step-7): mount ride request endpoints (/ride-requests)
  // TODO(step-8): mount driver availability & zone endpoints (/vehicles)
  // TODO(step-9): mount pool endpoints (/pools, /pools/:id/join)
  // TODO(step-10): mount lifecycle endpoints (/pools/:id/arrived, start, complete)
  // TODO(step-11): mount ride history endpoints (/rides/history)

  // Catch-all 404 for unmatched routes
  app.use(notFoundHandler);

  // Central error handling middleware (must be registered last)
  app.use(errorHandler);

  return app;
};

export const app = createApp();
