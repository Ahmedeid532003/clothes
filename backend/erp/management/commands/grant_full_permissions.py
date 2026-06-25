"""منح صلاحيات كاملة لمستخدم أو لكل مستخدمي المنشأة."""

from django.core.management.base import BaseCommand, CommandError

from erp.models import User
from erp.permissions_schema import full_permissions
from saas.models import Tenant
from tenancy.context import set_current_tenant
from tenancy.services import ensure_tenant_connection


class Command(BaseCommand):
    help = "Grant full ERP permissions (is_owner + all pages/features/actions)."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", help="Tenant slug (required unless --all-tenants)")
        parser.add_argument("--username", help="Specific username; omit with --all-users")
        parser.add_argument(
            "--all-users",
            action="store_true",
            help="Apply to every user in the tenant",
        )
        parser.add_argument(
            "--all-tenants",
            action="store_true",
            help="Apply to all active tenants (uses --all-users per tenant)",
        )

    def handle(self, *args, **options):
        if options["all_tenants"]:
            tenants = Tenant.objects.filter(status=Tenant.Status.ACTIVE)
            if not tenants.exists():
                raise CommandError("No active tenants found.")
            for tenant in tenants:
                self._grant_for_tenant(tenant, username=None, all_users=True)
            return

        slug = (options.get("tenant") or "").strip().lower()
        if not slug:
            raise CommandError("Provide --tenant <slug> or use --all-tenants.")

        try:
            tenant = Tenant.objects.get(slug=slug)
        except Tenant.DoesNotExist as exc:
            raise CommandError(f"Tenant '{slug}' not found.") from exc

        self._grant_for_tenant(
            tenant,
            username=(options.get("username") or "").strip().lower() or None,
            all_users=bool(options["all_users"]),
        )

    def _grant_for_tenant(self, tenant, *, username: str | None, all_users: bool):
        ensure_tenant_connection(tenant)
        set_current_tenant(tenant)

        qs = User.objects.using("tenant").all()
        if username:
            qs = qs.filter(username=username)
        elif not all_users:
            owner = (tenant.owner_username or "").strip().lower()
            if owner:
                qs = qs.filter(username=owner)
            else:
                raise CommandError(
                    f"Tenant '{tenant.slug}': pass --username or --all-users."
                )

        users = list(qs)
        if not users:
            raise CommandError(f"Tenant '{tenant.slug}': no matching users.")

        perms = full_permissions()
        for user in users:
            user.is_owner = True
            user.permissions = perms
            user.save(using="tenant", update_fields=["is_owner", "permissions", "updated_at"])
            self.stdout.write(
                self.style.SUCCESS(
                    f"[{tenant.slug}] {user.username} -> owner + full permissions"
                )
            )
