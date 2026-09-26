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

  // FRONTEND_URL is set on Vercel after the frontend deploys; localhost:3000 covers Docker and local dev.
  const allowedOrigins = [
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  // On a disallowed origin, pass `false` so CORS headers are simply
  // omitted. Throwing would route through errorHandler and return a
  // misleading 500 on the preflight, hiding the real mismatch.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
    })
  );

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
