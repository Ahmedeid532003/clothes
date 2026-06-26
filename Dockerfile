FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Runsite broken start: chmod +x start.sh && ./start.sh (no shell)
RUN CHMOD_BIN="$(command -v chmod)" \
    && mv "$CHMOD_BIN" "${CHMOD_BIN}.real" \
    && cp runsite-chmod-shim.sh "$CHMOD_BIN" \
    && "${CHMOD_BIN}.real" +x "$CHMOD_BIN" /app/start.sh /app/runsite-chmod-shim.sh

# Baked for Runsite zero-config deploy (rotate Neon password after go-live)
ENV DATABASE_URL=postgresql://neondb_owner:npg_xn8iIl4kyJZe@ep-plain-firefly-atpjb8f6-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
ENV CLOUD_SHARED_DB=true
ENV SECRET_KEY=mahaly-prod-secret-change-me-2026-runsite-neon
ENV DEBUG=false
ENV ALLOWED_HOSTS=mahalyerp-api.runsite.app
ENV PORT=8080
ENV WEB_CONCURRENCY=1
ENV USE_REDIS=false
ENV DEPLOY_GATE_ENABLED=false
ENV SKIP_STARTUP_MIGRATE=true

EXPOSE 8080

CMD ["/app/start.sh"]
