#!/usr/bin/env bash
# Intercepts Runsite broken start: chmod +x start.sh && ./start.sh
set -euo pipefail
exec /app/start.sh
