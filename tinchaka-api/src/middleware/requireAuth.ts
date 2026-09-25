import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt.service';

// Returns identical 401 for missing header and invalid token to avoid acting as an oracle for token validity
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header',
      },
    });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
    return;
  }

  req.user = { id: payload.userId, role: payload.role };
  next();
}
