import { PrismaClient } from '@prisma/client';

// In Vercel serverless, each cold-start re-imports every module.
// Storing the client on the Node.js global object prevents a new
// PrismaClient (and new connection pool) from being created on every
// invocation, which would exhaust Neon's pooler quickly.
//
// In Docker and test environments we always create a fresh instance so
// that test isolation and connection lifecycle work normally.

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function makePrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : [],
  });
}

export const prisma: PrismaClient =
  process.env.VERCEL === '1'
    ? // Serverless: reuse across warm invocations
      (global.__prisma ?? (global.__prisma = makePrismaClient()))
    : // Docker / test: fresh client per process
      makePrismaClient();
