"""إنشاء أدوار PostgreSQL منفصلة للمنشآت القديمة التي ليس لها db_user."""
from django.core.management.base import BaseCommand

from saas.models import Tenant
from tenancy.db import create_postgres_tenant_database
from tenancy.services import ensure_tenant_connection, migrate_tenant_database


class Command(BaseCommand):
    help = "توليد db_user/db_password وربط قواعد موجودة بأدوار PostgreSQL منفصلة"

    def add_arguments(self, parser):
        parser.add_argument("--slug", help="منشأة واحدة فقط")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="عرض ما سيُنفَّذ دون تغيير PostgreSQL",
        )

    def handle(self, *args, **options):
        qs = Tenant.objects.all().order_by("slug")
        if options.get("slug"):
            qs = qs.filter(slug=options["slug"].lower())

        for tenant in qs:
            if tenant.has_dedicated_db_credentials:
                self.stdout.write(f"  {tenant.slug}: لديه دور بالفعل ({tenant.db_user})")
                continue

            if not options["dry_run"]:
                db_user, db_pass = tenant.ensure_db_credentials(save=True)
            else:
                from tenancy.db import generate_tenant_db_credentials

                db_user, db_pass = generate_tenant_db_credentials(tenant)
            line = f"  {tenant.slug}: role={db_user} pass={db_pass} db={tenant.db_name}"
            if options["dry_run"]:
                self.stdout.write(self.style.WARNING(line + " (dry-run)"))
                continue

            create_postgres_tenant_database(tenant)
            ensure_tenant_connection(tenant)
            migrate_tenant_database(tenant)
            self.stdout.write(self.style.SUCCESS(line + " OK"))
