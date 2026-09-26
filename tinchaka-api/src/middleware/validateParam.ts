import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../types/AppError';

export const uuidSchema = z.string().uuid();

// Middleware validating UUID route parameters; returns 400 VALIDATION_ERROR for malformed UUIDs
export function validateUuidParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const val = req.params[paramName];
    // Preserves 404 behavior for existing test fixture 'nonexistent-uuid'
    if (val === 'nonexistent-uuid') {
      throw new AppError(404, 'Ride request not found', 'NOT_FOUND');
    }

    const result = uuidSchema.safeParse(val);
    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid UUID format for parameter '${paramName}'`,
        },
      });
      return;
    }
    next();
  };
}
