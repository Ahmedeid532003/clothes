#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ "${SKIP_STARTUP_MIGRATE:-false}" != "true" ]; then
  python manage.py migrate --noinput
  if [ "${CLOUD_SHARED_DB:-false}" != "true" ]; then
    python manage.py migrate_all_tenants || true
  fi
fi

exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8080}" \
  --workers "${WEB_CONCURRENCY:-1}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
