import { Request, Response, NextFunction } from 'express';
import { acceptSchema } from '../schemas/pool.schema';
import {
  acceptRequest,
  markArrived,
  markStarted,
  markCompleted,
  cancelPool,
  getActivePoolForDriver,
  listDriverHistory,
} from '../services/pool.service';

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

// Marks pool as arrived at pickup location
export async function arrived(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pool = await markArrived(req.user!.id, req.params.id);
    res.status(200).json({ pool });
  } catch (err) {
    next(err);
  }
}

// Marks pool trip as started (point of no return for cancellations)
export async function start(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pool = await markStarted(req.user!.id, req.params.id);
    res.status(200).json({ pool });
  } catch (err) {
    next(err);
  }
}

// Marks pool trip as completed and creates pending cash payment settlements
export async function complete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pool = await markCompleted(req.user!.id, req.params.id);
    res.status(200).json({ pool });
  } catch (err) {
    next(err);
  }
}

// Cancels the entire pool and all active member requests
export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pool = await cancelPool(req.user!.id, req.params.id);
    res.status(200).json({ pool });
  } catch (err) {
    next(err);
  }
}

// Returns active uncompleted pool for authenticated driver
export async function active(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pool = await getActivePoolForDriver(req.user!.id);
    res.status(200).json({ pool });
  } catch (err) {
    next(err);
  }
}

// Returns full pool trip history for authenticated driver
export async function history(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pools = await listDriverHistory(req.user!.id);
    res.status(200).json({ pools });
  } catch (err) {
    next(err);
  }
}
