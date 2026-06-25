"""تقارير أداء البائعين."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Count, Sum

from erp.sale_models import SaleLine


def seller_performance_report(*, branch_id=None, date_from=None, date_to=None) -> list[dict]:
    qs = (
        SaleLine.objects.using("tenant")
        .filter(sale__status="completed", seller__isnull=False)
        .select_related("seller", "sale")
    )
    if branch_id:
        qs = qs.filter(sale__branch_id=branch_id)
    if date_from:
        qs = qs.filter(sale__created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(sale__created_at__date__lte=date_to)

    rows = (
        qs.values(
            "seller_id",
            "seller__employee_code",
            "seller__full_name",
            "seller__username",
        )
        .annotate(
            invoice_count=Count("sale_id", distinct=True),
            line_count=Count("id"),
            qty_total=Sum("quantity"),
            sales_total=Sum("line_total"),
            commission_total=Sum("line_commission"),
        )
        .order_by("-sales_total")
    )

    out: list[dict] = []
    for row in rows:
        out.append(
            {
                "seller_id": str(row["seller_id"]),
                "employee_code": row["seller__employee_code"] or "",
                "full_name": row["seller__full_name"] or row["seller__username"] or "",
                "invoice_count": row["invoice_count"] or 0,
                "line_count": row["line_count"] or 0,
                "qty_total": str(row["qty_total"] or Decimal("0")),
                "sales_total": str(row["sales_total"] or Decimal("0")),
                "commission_total": str(row["commission_total"] or Decimal("0")),
            }
        )
    return out
