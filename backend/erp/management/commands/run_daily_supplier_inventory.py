from datetime import date

from django.core.management.base import BaseCommand
from django.db import connections

from erp.services.supplier_weekly_inventory import run_daily_supplier_inventory
from saas.models import Tenant
from tenancy.context import clear_current_tenant, set_current_tenant
from tenancy.services import ensure_tenant_connection


class Command(BaseCommand):
    help = "فحص يومي وإنشاء كشوف الجرد الأسبوعية للموردين"

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            dest="report_date",
            default="",
            help="تاريخ التقرير YYYY-MM-DD (افتراضي: اليوم)",
        )

    def handle(self, *args, **options):
        report_date = None
        if options.get("report_date"):
            report_date = date.fromisoformat(options["report_date"])

        tenants = Tenant.objects.exclude(status=Tenant.Status.SUSPENDED).order_by("slug")
        if not tenants.exists():
            self.stdout.write("No tenants found.")
            return

        total_created = 0
        for tenant in tenants:
            connections.close_all()
            ensure_tenant_connection(tenant)
            set_current_tenant(tenant)
            self.stdout.write(f"Tenant: {tenant.slug}")
            result = run_daily_supplier_inventory(report_date=report_date)
            total_created += result["created"]
            self.stdout.write(
                f"  created={result['created']} skipped={result['skipped']} errors={len(result['errors'])}"
            )
            for err in result["errors"]:
                self.stderr.write(f"  ! {err}")
            clear_current_tenant()

        self.stdout.write(self.style.SUCCESS(f"Done — {total_created} report(s) created."))
