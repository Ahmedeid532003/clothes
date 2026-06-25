#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

python manage.py migrate --noinput
python manage.py migrate_all_tenants || true
python manage.py collectstatic --noinput

exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
