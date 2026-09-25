import { Request, Response, NextFunction } from 'express';
import { acceptSchema } from '../schemas/pool.schema';
import { acceptRequest } from '../services/pool.service';

export async function accept(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = acceptSchema.parse(req.body);
    const { pool, created } = await acceptRequest(req.user!.id, validated.ride_request_id);
    // Consistently returns 200 with pool envelope per project plan
    res.status(200).json({ pool, created });
  } catch (err) {
    next(err);
  }
}
