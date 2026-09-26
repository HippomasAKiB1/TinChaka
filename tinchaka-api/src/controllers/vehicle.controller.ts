import { Request, Response, NextFunction } from 'express';
import { setOnlineSchema } from '../schemas/vehicle.schema';
import { setOnlineStatus } from '../services/vehicle.service';

export async function patchMeOnline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = setOnlineSchema.parse(req.body);
    const vehicle = await setOnlineStatus(req.user!.id, validated.is_online);
    res.status(200).json({ vehicle });
  } catch (err) {
    next(err);
  }
}
