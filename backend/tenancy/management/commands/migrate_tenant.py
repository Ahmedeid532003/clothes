from django.core.management.base import BaseCommand, CommandError

from saas.models import Tenant
from tenancy.context import set_current_tenant
from tenancy.services import ensure_tenant_connection, migrate_tenant_database


class Command(BaseCommand):
    help = "تطبيق migrations ERP على قاعدة منشأة واحدة"

    def add_arguments(self, parser):
        parser.add_argument("--slug", required=True)

    def handle(self, *args, **options):
        slug = options["slug"].lower()
        try:
            tenant = Tenant.objects.get(slug=slug)
        except Tenant.DoesNotExist:
            raise CommandError(f"Tenant '{slug}' not found.")

        ensure_tenant_connection(tenant)
        set_current_tenant(tenant)
        migrate_tenant_database(tenant)
        self.stdout.write(self.style.SUCCESS(f"ERP migrations applied on {tenant.db_name}"))
