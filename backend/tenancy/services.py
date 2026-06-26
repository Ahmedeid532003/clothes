from django.conf import settings
from django.core.management import call_command

from saas.models import Tenant
from tenancy.db import create_postgres_tenant_database, register_tenant_connection


def provision_tenant_database(tenant: Tenant) -> tuple[str, str]:
    """إنشاء قاعدة المحل وتطبيق migrations الـ ERP فقط."""
    if getattr(settings, "CLOUD_SHARED_DB", False):
        cfg = settings.DATABASES["default"]
        tenant.db_name = cfg["NAME"]
        tenant.db_user = cfg.get("USER", "")
        tenant.save(update_fields=["db_name", "db_user", "updated_at"])
        register_tenant_connection(tenant)
        call_command("migrate", "erp", database="tenant", verbosity=0, interactive=False)
        return tenant.db_user, ""

    db_user, db_password = tenant.ensure_db_credentials(save=True)
    create_postgres_tenant_database(tenant)
    register_tenant_connection(tenant)
    call_command("migrate", "erp", database="tenant", verbosity=0, interactive=False)
    return db_user, db_password


def migrate_tenant_database(tenant: Tenant) -> None:
    from django.db import connections

    from tenancy.db import TENANT_DB_ALIAS

    # إغلاق كل الاتصالات حتى لا يُطبَّق migrate على قاعدة المنشأة السابقة بالخطأ
    connections.close_all()
    register_tenant_connection(tenant)
    call_command(
        "migrate",
        "erp",
        database=TENANT_DB_ALIAS,
        verbosity=1,
        interactive=False,
    )


def ensure_tenant_connection(tenant: Tenant) -> None:
    register_tenant_connection(tenant)
