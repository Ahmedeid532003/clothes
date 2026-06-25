from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta

from saas.models import Plan, Subscription, Tenant
from tenancy.services import provision_tenant_database


class Command(BaseCommand):
    help = "إنشاء منشأة + قاعدة بيانات + migrations على tenant DB"

    def add_arguments(self, parser):
        parser.add_argument("--slug", required=True)
        parser.add_argument("--name", required=True)
        parser.add_argument("--plan", default="starter")
        parser.add_argument("--email", default="")

    def handle(self, *args, **options):
        slug = options["slug"].lower()
        try:
            plan = Plan.objects.get(code=options["plan"])
        except Plan.DoesNotExist:
            raise CommandError(f"Plan '{options['plan']}' not found. Run seed_platform first.")

        tenant, created = Tenant.objects.get_or_create(
            slug=slug,
            defaults={
                "name": options["name"],
                "plan": plan,
                "contact_email": options.get("email") or "",
                "status": Tenant.Status.PROVISIONING,
            },
        )
        if not created:
            self.stdout.write(self.style.WARNING(f"Tenant '{slug}' already exists."))

        provision_tenant_database(tenant)
        tenant.status = Tenant.Status.ACTIVE
        tenant.save(update_fields=["status", "updated_at"])

        Subscription.objects.filter(tenant=tenant, is_current=True).update(is_current=False)
        Subscription.objects.create(
            tenant=tenant,
            plan=plan,
            starts_at=timezone.localdate(),
            ends_at=timezone.localdate() + timedelta(days=365),
            is_current=True,
        )

        self.stdout.write(self.style.SUCCESS(f"Tenant '{slug}' ready. DB: {tenant.db_name}"))
