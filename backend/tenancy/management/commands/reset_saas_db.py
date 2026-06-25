"""إعادة إنشاء قاعدة المنصة من الصفر (تطوير فقط)."""
import psycopg2
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from tenancy.db import create_postgres_database


class Command(BaseCommand):
    help = "Drop and recreate SaaS database, then migrate (dev only)"

    def handle(self, *args, **options):
        cfg = settings.DATABASES["default"]
        db_name = cfg["NAME"]

        conn = psycopg2.connect(
            dbname="postgres",
            user=cfg["USER"],
            password=cfg["PASSWORD"],
            host=cfg["HOST"],
            port=cfg["PORT"],
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()",
                [db_name],
            )
            cursor.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
        conn.close()

        create_postgres_database(db_name)
        self.stdout.write(self.style.WARNING(f"Dropped and recreated '{db_name}'."))
        for app in ("contenttypes", "auth", "admin", "sessions", "saas"):
            call_command("migrate", app, database="default", verbosity=1)
        self.stdout.write(self.style.SUCCESS("Platform migrations applied."))
