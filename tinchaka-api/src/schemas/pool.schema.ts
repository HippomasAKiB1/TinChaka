import { z } from 'zod';

export const acceptSchema = z.object({
  ride_request_id: z.string().uuid(),
});

export type AcceptInput = z.infer<typeof acceptSchema>;
