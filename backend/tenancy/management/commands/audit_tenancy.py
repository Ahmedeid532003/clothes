from django.conf import settings
from django.core.management.base import BaseCommand

import psycopg2

from saas.models import Tenant


class Command(BaseCommand):
    help = "فحص فصل قواعد المنصة عن قواعد المحلات"

    def handle(self, *args, **options):
        cfg = settings.DATABASES["default"]
        prefix = settings.TENANT_DB_PREFIX

        conn = psycopg2.connect(
            dbname=cfg["NAME"],
            user=cfg["USER"],
            password=cfg["PASSWORD"],
            host=cfg["HOST"],
            port=cfg["PORT"],
        )
        with conn.cursor() as c:
            c.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'erp_%'"
            )
            erp_platform = [r[0] for r in c.fetchall()]
        conn.close()

        self.stdout.write(f"Platform DB ({cfg['NAME']}):")
        if erp_platform:
            self.stdout.write(self.style.ERROR(f"  ERP tables found (BAD): {erp_platform}"))
        else:
            self.stdout.write(self.style.SUCCESS("  No ERP tables (OK)"))

        admin = psycopg2.connect(
            dbname="postgres",
            user=cfg["USER"],
            password=cfg["PASSWORD"],
            host=cfg["HOST"],
            port=cfg["PORT"],
        )
        with admin.cursor() as c:
            c.execute("SELECT datname FROM pg_database WHERE datname LIKE %s", [f"{prefix}%"])
            db_names = {r[0] for r in c.fetchall()}
        admin.close()

        for tenant in Tenant.objects.all():
            expected = tenant.db_name
            exists = expected in db_names
            line = f"  {tenant.slug} -> {expected}: "
            if not exists:
                self.stdout.write(self.style.ERROR(line + "DB MISSING"))
                continue
            if tenant.has_dedicated_db_credentials:
                t_user = tenant.db_user
                t_pass = tenant.get_db_password()
            else:
                t_user = cfg["USER"]
                t_pass = cfg["PASSWORD"]
            tconn = psycopg2.connect(
                dbname=expected,
                user=t_user,
                password=t_pass,
                host=cfg["HOST"],
                port=cfg["PORT"],
            )
            with tconn.cursor() as c:
                c.execute(
                    "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'erp_%'"
                )
                count = c.fetchone()[0]
            tconn.close()
            if count >= 5:
                self.stdout.write(self.style.SUCCESS(line + f"OK ({count} erp tables)"))
            else:
                self.stdout.write(self.style.WARNING(line + f"incomplete ({count} erp tables)"))
