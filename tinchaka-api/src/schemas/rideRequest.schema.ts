import { z } from 'zod';
import { ZONES } from '../domain/zones';

// In single-vehicle MVP, max seats_requested is Bullet's capacity (3) per PROJECT_PLAN.md §1
export const createRideRequestSchema = z.object({
  pickup_zone: z.enum(ZONES),
  destination_zone: z.enum(ZONES),
  seats_requested: z.number().int().min(1).max(3),
});

export type CreateRideRequestInput = z.infer<typeof createRideRequestSchema>;
