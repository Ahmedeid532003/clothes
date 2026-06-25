import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connections
from saas.models import Tenant
from tenancy.db import register_tenant_connection

for tenant in Tenant.objects.filter(is_active=True).order_by("slug"):
    connections.close_all()
    register_tenant_connection(tenant)
    with connections["tenant"].cursor() as cur:
        cur.execute(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'erp_purchaseinvoice'
              AND column_name IN ('tax_amount', 'payment_method')
            """
        )
        cols = sorted(r[0] for r in cur.fetchall())
    print(f"{tenant.slug}: {cols}")
