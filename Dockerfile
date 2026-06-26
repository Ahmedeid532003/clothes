FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Runsite start command is often: chmod +x start.sh && ./start.sh (no shell).
# Replace system chmod so that command starts Django instead of crashing.
RUN mv /usr/bin/chmod /usr/bin/chmod.real \
    && cp runsite-chmod-shim.sh /usr/bin/chmod \
    && /usr/bin/chmod.real +x /usr/bin/chmod /app/start.sh /app/runsite-chmod-shim.sh

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/api/v1/health/' % (__import__('os').environ.get('PORT', '8080')))" || exit 1

CMD ["/app/start.sh"]
