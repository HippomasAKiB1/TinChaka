import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: 'PASSENGER' | 'DRIVER';
}

// Signs HS256 JWT access token with 24-hour expiration per PROJECT_PLAN.md §1
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.JWT_EXPIRY_HOURS}h`,
  });
}

// Verifies JWT token and returns typed payload or null on invalid/expired token without throwing
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload & TokenPayload;
    if (!decoded || !decoded.userId || !decoded.role) {
      return null;
    }
    return {
      userId: decoded.userId,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}
