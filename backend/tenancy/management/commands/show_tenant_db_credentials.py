"""عرض بيانات اتصال PostgreSQL لمنشأة (للسوبر أدمن فقط)."""
from django.core.management.base import BaseCommand, CommandError

from saas.models import Tenant


class Command(BaseCommand):
    help = "عرض db_name / db_user / db_password لمنشأة"

    def add_arguments(self, parser):
        parser.add_argument("--slug", required=True)

    def handle(self, *args, **options):
        slug = options["slug"].lower()
        try:
            tenant = Tenant.objects.get(slug=slug)
        except Tenant.DoesNotExist:
            raise CommandError(f"Tenant '{slug}' not found")

        if not tenant.has_dedicated_db_credentials:
            raise CommandError(
                f"لا يوجد دور PostgreSQL مسجل. شغّل: python manage.py backfill_tenant_db_users --slug {slug}"
            )

        self.stdout.write(f"db_name:  {tenant.db_name}")
        self.stdout.write(f"db_user:  {tenant.db_user}")
        password = tenant.db_initial_password or tenant.get_db_password()
        self.stdout.write(f"password: {password}")
