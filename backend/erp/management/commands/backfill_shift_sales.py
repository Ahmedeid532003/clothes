"""ربط مبيعات POS السابقة بوردياتها عبر مراجع حركات الوردية."""

from django.core.management.base import BaseCommand

from erp.accounting_models import CashShift, ShiftMovement
from erp.sale_models import Sale
from erp.services.accounting_vouchers import sync_shift_from_sales
from saas.models import Tenant
from tenancy.context import set_current_tenant
from tenancy.services import ensure_tenant_connection


class Command(BaseCommand):
    help = "Backfill Sale.cash_shift from shift SALE movement references."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", required=True)

    def handle(self, *args, **options):
        slug = options["tenant"].lower()
        tenant = Tenant.objects.get(slug=slug)
        ensure_tenant_connection(tenant)
        set_current_tenant(tenant)

        linked = 0
        shifts = (
            CashShift.objects.using("tenant")
            .prefetch_related("movements")
            .order_by("-opened_at")[:500]
        )
        for shift in shifts:
            codes = [
                m.reference
                for m in shift.movements.all()
                if m.movement_type == ShiftMovement.MovementType.SALE and (m.reference or "").strip()
            ]
            if codes:
                for sale in Sale.objects.using("tenant").filter(
                    code__in=codes, cash_shift__isnull=True
                ):
                    sale.cash_shift = shift
                    sale.save(using="tenant", update_fields=["cash_shift"])
                    linked += 1

            end = shift.closed_at
            window_sales = Sale.objects.using("tenant").filter(
                created_by_id=shift.employee_id,
                cash_shift__isnull=True,
                status=Sale.Status.COMPLETED,
                created_at__gte=shift.opened_at,
            )
            if end:
                window_sales = window_sales.filter(created_at__lte=end)
            for sale in window_sales:
                sale.cash_shift = shift
                sale.save(using="tenant", update_fields=["cash_shift"])
                linked += 1
            linked += sync_shift_from_sales(shift)

        self.stdout.write(self.style.SUCCESS(f"Linked {linked} sales to shifts for tenant '{slug}'."))
