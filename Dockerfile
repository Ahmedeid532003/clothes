FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

RUN chmod +x start.sh runsite-chmod-shim.sh \
    && cp runsite-chmod-shim.sh /app/chmod

ENV PORT=8080
ENV PATH="/app:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
EXPOSE 8080

CMD ["/app/start.sh"]
