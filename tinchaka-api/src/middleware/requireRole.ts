import { Request, Response, NextFunction, RequestHandler } from 'express';

// Factory that restricts access to users with one of the specified roles
export function requireRole(...allowed: Array<'PASSENGER' | 'DRIVER'>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(500).json({
        error: {
          code: 'INTERNAL',
          message: 'requireRole used without requireAuth',
        },
      });
      return;
    }

    if (!allowed.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient role',
        },
      });
      return;
    }

    next();
  };
}
