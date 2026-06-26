FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

RUN chmod +x start.sh

ENV PORT=8080
EXPOSE 8080

# Runsite may pass a broken start command (chmod && ...); ENTRYPOINT still runs start.sh.
ENTRYPOINT ["/bin/bash", "/app/start.sh"]
CMD []
