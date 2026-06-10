#!/bin/sh
set -e

if [ "${RUN_PRISMA_MIGRATIONS:-true}" = "true" ]; then
  node /app/node_modules/prisma/build/index.js migrate deploy --schema /app/apps/backend/prisma/schema.prisma
fi

if [ "${BOOTSTRAP_ADMIN:-false}" = "true" ]; then
  node /app/apps/backend/scripts/bootstrap-admin.js
fi

exec node dist/main.js
