"""
إزالة أي بقايا ERP من قاعدة المنصة MainClothes (جداول + سجلات migrations).
آمن للتشغيل: لا يمس قواعد mahaly_t_*.
"""
from django.conf import settings
from django.core.management.base import BaseCommand

import psycopg2


class Command(BaseCommand):
    help = "Remove stray ERP tables/migrations from platform database"

    def handle(self, *args, **options):
        cfg = settings.DATABASES["default"]
        conn = psycopg2.connect(
            dbname=cfg["NAME"],
            user=cfg["USER"],
            password=cfg["PASSWORD"],
            host=cfg["HOST"],
            port=cfg["PORT"],
        )
        conn.autocommit = True
        tables: list[str] = []
        deleted = 0
        with conn.cursor() as c:
            c.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'erp_%'"
            )
            tables = [r[0] for r in c.fetchall()]
            for table in tables:
                c.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
                self.stdout.write(self.style.WARNING(f"Dropped {table}"))

            c.execute("DELETE FROM django_migrations WHERE app = 'erp'")
            deleted = c.rowcount
            if deleted:
                self.stdout.write(self.style.WARNING(f"Removed {deleted} erp migration records"))

        conn.close()
        if not tables and not deleted:
            self.stdout.write(self.style.SUCCESS("Platform DB is clean — no ERP artifacts."))
        else:
            self.stdout.write(self.style.SUCCESS("Cleanup complete."))
