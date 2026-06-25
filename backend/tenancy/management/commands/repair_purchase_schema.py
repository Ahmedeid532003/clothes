"""إصلاح أعمدة فواتير الشراء إن وُجدت سجلات ترحيل بدون أعمدة فعلية."""

from django.core.management.base import BaseCommand
from django.db import connections

from saas.models import Tenant
from tenancy.db import register_tenant_connection


REPAIR_SQL = [
    """
    ALTER TABLE erp_purchaseinvoice
    ADD COLUMN IF NOT EXISTS payment_method varchar(20) NOT NULL DEFAULT 'credit'
    """,
    """
    ALTER TABLE erp_purchaseinvoice
    ADD COLUMN IF NOT EXISTS tax_amount numeric(14, 2) NOT NULL DEFAULT 0
    """,
    """
    ALTER TABLE erp_purchaseinvoiceline
    ADD COLUMN IF NOT EXISTS tax_percent numeric(6, 2) NOT NULL DEFAULT 0
    """,
    """
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'erp_purchaseinvoice' AND column_name = 'journal_entry_id'
      ) THEN
        ALTER TABLE erp_purchaseinvoice
        ADD COLUMN journal_entry_id uuid NULL
        REFERENCES erp_journalentry(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
      END IF;
    END $$;
    """,
    """
    ALTER TABLE erp_purchaseinvoice
    ADD COLUMN IF NOT EXISTS return_reason varchar(30) NOT NULL DEFAULT ''
    """,
    """
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'erp_supplieraccountentry' AND column_name = 'purchase_invoice_id'
      ) THEN
        ALTER TABLE erp_supplieraccountentry
        ADD COLUMN purchase_invoice_id uuid NULL
        REFERENCES erp_purchaseinvoice(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
      END IF;
    END $$;
    """,
]


class Command(BaseCommand):
    help = "إضافة أعمدة فواتير الشراء الناقصة على قواعد المنشآت (PostgreSQL)"

    def add_arguments(self, parser):
        parser.add_argument("--slug", help="منشأة واحدة فقط")

    def handle(self, *args, **options):
        qs = Tenant.objects.order_by("slug")
        if options.get("slug"):
            qs = qs.filter(slug=options["slug"])

        for tenant in qs:
            connections.close_all()
            register_tenant_connection(tenant)
            self.stdout.write(f"Repairing {tenant.slug} ({tenant.db_name})...")
            with connections["tenant"].cursor() as cur:
                for stmt in REPAIR_SQL:
                    cur.execute(stmt)
            self.stdout.write(self.style.SUCCESS(f"  OK — {tenant.slug}"))
