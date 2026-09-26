import { z } from 'zod';
import { ZONES } from '../domain/zones';

// In single-vehicle MVP, max seats_requested is Bullet's capacity (3) per PROJECT_PLAN.md §1
// .strict() rejects unknown fields with 400 VALIDATION_ERROR
export const createRideRequestSchema = z
  .object({
    pickup_zone: z.enum(ZONES),
    destination_zone: z.enum(ZONES),
    seats_requested: z.number().int().min(1).max(3),
  })
  .strict();

export type CreateRideRequestInput = z.infer<typeof createRideRequestSchema>;

// Validates ?zone= query parameter for pending request list
export const pendingInZoneQuerySchema = z
  .object({
    zone: z.enum(ZONES),
  })
  .strict();

export type PendingInZoneQueryInput = z.infer<typeof pendingInZoneQuerySchema>;
