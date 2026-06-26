from django.conf import settings

TENANT_DB_ALIAS = "tenant"


def erp_database_alias() -> str:
    """Alias used for ERP models — 'default' on Neon/shared cloud DB."""
    if getattr(settings, "CLOUD_SHARED_DB", False):
        return "default"
    return TENANT_DB_ALIAS
