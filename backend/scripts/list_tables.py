import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection

with connection.cursor() as c:
    c.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1")
    print([r[0] for r in c.fetchall()])
