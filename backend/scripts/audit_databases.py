"""فحص: هل جداول ERP موجودة على MainClothes؟"""
import os
import sys

import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
from django.db import connection

import psycopg2

ERP_TABLES = (
    "erp_user",
    "erp_branch",
    "erp_warehouse",
    "erp_season",
    "erp_branchwarehouse",
)

cfg = settings.DATABASES["default"]
conn = psycopg2.connect(
    dbname=cfg["NAME"],
    user=cfg["USER"],
    password=cfg["PASSWORD"],
    host=cfg["HOST"],
    port=cfg["PORT"],
)
with conn.cursor() as c:
    c.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    )
    tables = [r[0] for r in c.fetchall()]
conn.close()

erp_on_platform = [t for t in tables if t.startswith("erp_")]
print(f"Platform DB: {cfg['NAME']}")
print(f"Total tables: {len(tables)}")
print(f"ERP tables on platform (BAD): {erp_on_platform or 'none'}")

# tenant DBs
admin = psycopg2.connect(
    dbname="postgres",
    user=cfg["USER"],
    password=cfg["PASSWORD"],
    host=cfg["HOST"],
    port=cfg["PORT"],
)
with admin.cursor() as c:
    prefix = settings.TENANT_DB_PREFIX
    c.execute("SELECT datname FROM pg_database WHERE datname LIKE %s", [f"{prefix}%"])
    tenant_dbs = [r[0] for r in c.fetchall()]
admin.close()

for db_name in tenant_dbs:
    tconn = psycopg2.connect(
        dbname=db_name,
        user=cfg["USER"],
        password=cfg["PASSWORD"],
        host=cfg["HOST"],
        port=cfg["PORT"],
    )
    with tconn.cursor() as c:
        c.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'erp_%'"
        )
        erp_tables = [r[0] for r in c.fetchall()]
    tconn.close()
    print(f"Tenant DB {db_name}: erp tables = {erp_tables or 'MISSING'}")
