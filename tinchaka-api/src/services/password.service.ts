// bcryptjs (pure JS) instead of bcrypt (native) — required for
// Vercel serverless where install scripts that compile native binaries are blocked.
import bcrypt from 'bcryptjs';

// 10 salt rounds provides optimal trade-off between brute-force resistance and CPU latency per PROJECT_PLAN.md §1
const BCRYPT_SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
