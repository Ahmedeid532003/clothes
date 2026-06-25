from django.core.management.base import BaseCommand
from django.db import connections

from saas.models import Tenant
from tenancy.services import migrate_tenant_database


class Command(BaseCommand):
    help = "تطبيق migrations ERP على كل المنشآت"

    def handle(self, *args, **options):
        tenants = Tenant.objects.order_by("slug")
        if not tenants.exists():
            self.stdout.write("No tenants found.")
            return
        for tenant in tenants:
            connections.close_all()
            self.stdout.write(f"Migrating {tenant.slug} ({tenant.db_name})...")
            migrate_tenant_database(tenant)
        self.stdout.write(self.style.SUCCESS(f"Done — {tenants.count()} tenant(s)."))
