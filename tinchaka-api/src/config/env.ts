import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // 24-hour token expiry balances user convenience and risk for MVP scale per PROJECT_PLAN.md §1
  JWT_EXPIRY_HOURS: z.coerce.number().default(24),
});

export const env = envSchema.parse(process.env);
