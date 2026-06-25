"""إيرادات الاشتراكات في لوحة تحكم الأدمن."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from django.contrib import admin
from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import render
from django.urls import path, reverse
from django.utils import timezone

from saas.models import PaymentRecord

METHOD_LABELS_AR = {
    PaymentRecord.Method.CASH: "نقدي",
    PaymentRecord.Method.FAWRY: "فوري",
    PaymentRecord.Method.PAYMOB: "Paymob",
    PaymentRecord.Method.INSTAPAY: "إنستاباي",
    PaymentRecord.Method.CARD: "بطاقة",
    PaymentRecord.Method.OTHER: "أخرى",
}

PERIOD_CHOICES = (
    ("all", "كل الفترات"),
    ("month", "هذا الشهر"),
    ("year", "هذه السنة"),
)


def format_money(amount: Decimal | None) -> str:
    value = amount if amount is not None else Decimal("0")
    return f"{value:,.2f} ج.م"


def _period_bounds(period: str, *, now: datetime | None = None) -> tuple[datetime | None, datetime | None]:
    now = now or timezone.now()
    if period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, None
    if period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, None
    return None, None


def _filtered_payments(period: str = "all"):
    qs = PaymentRecord.objects.select_related("tenant", "tenant__plan")
    start, end = _period_bounds(period)
    if start is not None:
        qs = qs.filter(paid_at__gte=start)
    if end is not None:
        qs = qs.filter(paid_at__lt=end)
    return qs


def get_revenue_summary() -> dict:
    agg = PaymentRecord.objects.aggregate(
        total=Coalesce(Sum("amount"), Decimal("0")),
        count=Count("id"),
    )
    month_start, _ = _period_bounds("month")
    month_agg = PaymentRecord.objects.filter(paid_at__gte=month_start).aggregate(
        total=Coalesce(Sum("amount"), Decimal("0")),
        count=Count("id"),
    )
    total = agg["total"]
    month_total = month_agg["total"]
    return {
        "total_revenue": total,
        "total_revenue_display": format_money(total),
        "revenue_this_month": month_total,
        "revenue_this_month_display": format_money(month_total),
        "payment_count": agg["count"],
        "payments_this_month": month_agg["count"],
        "revenue_details_url": reverse("admin:saas_revenue_details"),
    }


def _payment_rows(qs):
    rows = []
    for payment in qs.order_by("-paid_at")[:500]:
        tenant = payment.tenant
        rows.append(
            {
                "id": payment.id,
                "tenant_name": tenant.name,
                "tenant_slug": tenant.slug,
                "plan_name": tenant.plan.name if tenant.plan_id else "—",
                "amount": payment.amount,
                "amount_display": format_money(payment.amount),
                "method": payment.method,
                "method_display": METHOD_LABELS_AR.get(
                    payment.method, payment.get_method_display()
                ),
                "reference": payment.reference or "—",
                "paid_at": timezone.localtime(payment.paid_at),
                "notes": payment.notes,
                "admin_url": reverse(
                    "admin:saas_paymentrecord_change", args=[payment.pk]
                ),
                "tenant_admin_url": reverse(
                    "admin:saas_tenant_change", args=[tenant.pk]
                ),
            }
        )
    return rows


def revenue_details_view(request):
    period = request.GET.get("period", "all")
    if period not in dict(PERIOD_CHOICES):
        period = "all"

    qs = _filtered_payments(period)
    summary = qs.aggregate(
        total=Coalesce(Sum("amount"), Decimal("0")),
        count=Count("id"),
    )

    context = {
        **admin.site.each_context(request),
        "title": "تفاصيل إيرادات الاشتراكات",
        "period": period,
        "period_choices": PERIOD_CHOICES,
        "summary_total": summary["total"],
        "summary_total_display": format_money(summary["total"]),
        "summary_count": summary["count"],
        "payments": _payment_rows(qs),
        "add_payment_url": reverse("admin:saas_paymentrecord_add"),
        "payment_list_url": reverse("admin:saas_paymentrecord_changelist"),
    }
    return render(request, "admin/revenue_details.html", context)


def patch_admin_revenue():
    site = admin.site
    original_get_urls = site.get_urls

    def get_urls():
        custom = [
            path(
                "revenue/",
                site.admin_view(revenue_details_view),
                name="saas_revenue_details",
            ),
        ]
        return custom + original_get_urls()

    site.get_urls = get_urls
