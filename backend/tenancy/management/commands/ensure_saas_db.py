"""إنشاء قاعدة MainClothes إن لم تكن موجودة."""
from django.core.management.base import BaseCommand

from tenancy.db import create_postgres_database


class Command(BaseCommand):
    help = "Create SaaS database if missing"

    def handle(self, *args, **options):
        from django.conf import settings

        db_name = settings.DATABASES["default"]["NAME"]
        create_postgres_database(db_name)
        self.stdout.write(self.style.SUCCESS(f"Database '{db_name}' is ready."))
