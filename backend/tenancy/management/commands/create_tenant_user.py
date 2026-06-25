from django.core.management.base import BaseCommand, CommandError

from erp.models import Branch, User
from saas.models import GlobalUsername, Tenant
from tenancy.context import set_current_tenant
from tenancy.services import ensure_tenant_connection, provision_tenant_database


class Command(BaseCommand):
    help = "إنشاء مستخدم ERP داخل منشأة"

    def add_arguments(self, parser):
        parser.add_argument("--tenant", required=True)
        parser.add_argument("--username", required=True)
        parser.add_argument("--password", required=True)
        parser.add_argument("--full-name", default="")
        parser.add_argument("--branch-code", default="main")

    def handle(self, *args, **options):
        slug = options["tenant"].lower()
        username = options["username"].lower()

        try:
            tenant = Tenant.objects.get(slug=slug)
        except Tenant.DoesNotExist:
            raise CommandError(f"Tenant '{slug}' not found.")

        if tenant.status != Tenant.Status.ACTIVE:
            raise CommandError(f"Tenant status is '{tenant.status}'.")

        ensure_tenant_connection(tenant)
        set_current_tenant(tenant)

        if GlobalUsername.objects.filter(username=username).exists():
            raise CommandError(f"Username '{username}' already taken globally.")

        from erp.services import branches as branch_service

        branch, _ = Branch.objects.using("tenant").get_or_create(
            code=options["branch_code"],
            defaults={"name_ar": "الفرع الرئيسي", "name_en": "Main Branch"},
        )
        branch_service.ensure_branch_sale_warehouse(branch)

        user = User._default_manager.db_manager("tenant").create_user(
            username=username,
            password=options["password"],
            full_name=options["full_name"] or username,
            default_branch=branch,
        )

        GlobalUsername.objects.create(username=username, tenant=tenant)
        self.stdout.write(self.style.SUCCESS(f"User '{username}' created for tenant '{slug}'."))
