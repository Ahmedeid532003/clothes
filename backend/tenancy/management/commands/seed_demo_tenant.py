from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from erp.models import Branch, Season, User, Warehouse
from saas.models import GlobalUsername, Plan, Subscription, Tenant
from tenancy.context import set_current_tenant
from tenancy.db_alias import erp_database_alias
from tenancy.services import ensure_tenant_connection, provision_tenant_database


class Command(BaseCommand):
    help = "منشأة تجريبية كاملة: DB + فرع + مخزن + موسم + مستخدم"

    def add_arguments(self, parser):
        parser.add_argument("--slug", default="demo")
        parser.add_argument("--name", default="Demo Fashion")
        parser.add_argument("--username", default="owner@demo")
        parser.add_argument("--password", default="demo1234")

    def handle(self, *args, **options):
        call_command("seed_platform")

        plan = Plan.objects.get(code="starter")
        slug = options["slug"].lower()
        username = options["username"].lower()

        tenant, created = Tenant.objects.get_or_create(
            slug=slug,
            defaults={
                "name": options["name"],
                "plan": plan,
                "status": Tenant.Status.PROVISIONING,
            },
        )
        if created or tenant.status == Tenant.Status.PROVISIONING:
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

        ensure_tenant_connection(tenant)
        set_current_tenant(tenant)
        db = erp_database_alias()

        from erp.services import branches as branch_service

        branch, _ = Branch.objects.using(db).get_or_create(
            code="main",
            defaults={"name_ar": "الفرع الرئيسي", "name_en": "Main Branch"},
        )
        branch_service.ensure_branch_sale_warehouse(branch)
        Season.objects.using(db).get_or_create(
            code="2026-ss",
            defaults={
                "name_ar": "صيف 2026",
                "name_en": "Summer 2026",
                "is_open": True,
                "is_current": True,
            },
        )

        if not GlobalUsername.objects.filter(username=username).exists():
            User._default_manager.db_manager(db).create_user(
                username=username,
                password=options["password"],
                full_name="مالك تجريبي",
                default_branch=branch,
            )
            GlobalUsername.objects.create(username=username, tenant=tenant)

        self.stdout.write(self.style.SUCCESS("Demo tenant ready."))
        self.stdout.write(f"  Tenant slug : {slug}")
        self.stdout.write(f"  Header      : X-Tenant-Slug: {slug}")
        self.stdout.write(f"  Username    : {username}")
        self.stdout.write(f"  Password    : {options['password']}")
