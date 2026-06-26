#!/usr/bin/env bash
# Runsite sometimes starts the container with: chmod +x start.sh && ./start.sh
# Without a shell that invokes /usr/bin/chmod and crashes. This shadow binary
# is placed first on PATH so "chmod" runs the app instead.
set -euo pipefail
exec /app/start.sh
