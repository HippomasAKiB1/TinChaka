#!/bin/sh
set -e

# TODO(step-4): prisma migrate deploy && prisma db seed

echo "[entrypoint.sh] Starting TinChaka API server..."
exec node dist/index.js
