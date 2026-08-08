import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

url = os.environ.get("CLOUD_DATABASE_URL", "").strip()
if not url:
    print("CLOUD_DATABASE_URL missing")
    sys.exit(1)

p = urlparse(url)
conn = psycopg2.connect(
    host=p.hostname,
    user=p.username,
    password=p.password,
    dbname=p.path.lstrip("/").split("?")[0],
    port=p.port or 5432,
    sslmode="require",
)
cur = conn.cursor()
cur.execute(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'saas%' ORDER BY 1"
)
print("SAAS", [r[0] for r in cur.fetchall()])
try:
    cur.execute("SELECT slug FROM saas_tenant")
    print("TENANTS", [r[0] for r in cur.fetchall()])
except Exception as exc:
    print("TENANT_ERR", exc)
try:
    cur.execute("SELECT COUNT(*) FROM erp_user")
    print("ERP_USERS", cur.fetchone()[0])
except Exception as exc:
    print("ERP_USER_ERR", exc)
