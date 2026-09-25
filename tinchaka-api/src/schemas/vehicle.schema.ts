import { z } from 'zod';

export const setOnlineSchema = z.object({
  is_online: z.boolean(),
});

export type SetOnlineInput = z.infer<typeof setOnlineSchema>;
