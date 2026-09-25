#!/bin/sh
set -e

echo "[entrypoint] Running migrations..."
npx prisma migrate deploy

echo "[entrypoint] Seeding database..."
npx prisma db seed

echo "[entrypoint] Starting API server..."
exec node dist/index.js
