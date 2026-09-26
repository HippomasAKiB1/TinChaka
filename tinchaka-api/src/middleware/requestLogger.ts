import { Request, Response, NextFunction } from 'express';

// Request logging middleware tracking method, URL, status code, latency, and caller identity
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip logging /health to keep container probe logs quiet
  if (req.path === '/health' || req.originalUrl === '/health') {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user?.id ?? 'none';
    console.log(`[req] ${req.method} ${req.originalUrl || req.path} ${res.statusCode} ${duration}ms - user=${userId}`);
  });

  next();
}
