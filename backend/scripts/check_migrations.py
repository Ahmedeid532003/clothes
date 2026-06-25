import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
import psycopg2

cfg = settings.DATABASES["default"]
conn = psycopg2.connect(dbname=cfg["NAME"], user=cfg["USER"], password=cfg["PASSWORD"], host=cfg["HOST"], port=cfg["PORT"])
with conn.cursor() as c:
    c.execute("SELECT app, name FROM django_migrations WHERE app='erp' ORDER BY id")
    rows = c.fetchall()
conn.close()
print(f"erp migrations recorded on {cfg['NAME']}: {rows or 'none'}")
