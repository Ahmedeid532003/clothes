"""Check customer tables and erp migrations per tenant DB."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.db import connections

from saas.models import Tenant
from tenancy.db import register_tenant_connection


def check(slug: str) -> None:
    tenant = Tenant.objects.get(slug=slug)
    register_tenant_connection(tenant)
    conn = connections["tenant"]
    conn.settings_dict["NAME"] = tenant.db_name
    conn.close()
    with conn.cursor() as c:
        c.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' "
            "AND tablename LIKE 'erp_customer%%' ORDER BY 1"
        )
        tables = [r[0] for r in c.fetchall()]
        c.execute(
            "SELECT name FROM django_migrations WHERE app='erp' ORDER BY name"
        )
        migs = [r[0] for r in c.fetchall()]
    print(f"\n=== {slug} ({tenant.db_name}) ===")
    print("customer tables:", tables or "(none)")
    print("erp migrations count:", len(migs))
    if migs:
        print("last 5:", migs[-5:])


if __name__ == "__main__":
    for s in sys.argv[1:] or ["demo", "eid", "eidali"]:
        check(s)
