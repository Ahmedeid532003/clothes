"""عملاء نقطة البيع — تحصيل ومراجعة مع تقييم تلقائي."""

from __future__ import annotations

from decimal import Decimal

from erp.customer_models import Customer
from erp.receivable_models import InstallmentLine
from erp.services import customers as customer_service
from erp.services.receivables import _customer_ar_summary, _days_overdue, _effective_due_date

_USING = "tenant"

_TIER_LABELS = {
    "normal": "عادي",
    "excellent": "ممتاز",
    "black": "بلاك",
    "lawyer": "محامي",
}

_TIER_COLORS = {
    "normal": "",
    "excellent": "#16a34a",
    "black": "#000000",
    "lawyer": "#dc2626",
}


def _installment_stats(customer_id) -> dict:
    lines = (
        InstallmentLine.objects.using(_USING)
        .select_related("contract")
        .filter(contract__customer_id=customer_id)
        .exclude(status=InstallmentLine.Status.CANCELLED)
    )
    late_count = 0
    overdue_count = 0
    max_days = 0
    open_balance = Decimal("0")
    for ln in lines:
        if ln.status == InstallmentLine.Status.PAID:
            continue
        bal = ln.balance
        open_balance += bal
        effective_due = _effective_due_date(ln)
        days = _days_overdue(effective_due)
        max_days = max(max_days, days)
        if ln.status == InstallmentLine.Status.LATE or days > 0:
            overdue_count += 1
        if ln.status == InstallmentLine.Status.LATE or days >= 15:
            late_count += 1
    return {
        "late_count": late_count,
        "overdue_count": overdue_count,
        "max_installment_days_overdue": max_days,
        "open_installment_balance": str(open_balance.quantize(Decimal("0.01"))),
    }


def _tier_from_group(group) -> str | None:
    name = (group.name_ar or "").lower()
    color = (getattr(group, "display_color", None) or "").lower()
    if "محام" in name or color in ("#dc2626", "#ef4444"):
        return "lawyer"
    if "بلاك" in name or "black" in name or color == "#000000":
        return "black"
    if "ممتاز" in name or color in ("#16a34a", "#22c55e"):
        return "excellent"
    if "عادي" in name or color in ("", "#f8fafc", "#ffffff"):
        return "normal"
    return None


def _auto_tier(*, customer: Customer, ar: dict, inst: dict) -> str:
    profile = customer.profile_data or {}
    if profile.get("legal_case") in (True, "true", "1", 1):
        return "lawyer"
    if customer.is_stopped and "محام" in (customer.stop_reason or ""):
        return "lawyer"

    compliance = float(ar.get("compliance_percent") or 100)
    max_days = max(int(ar.get("max_days_overdue") or 0), int(inst.get("max_installment_days_overdue") or 0))
    late_count = int(inst.get("late_count") or 0)
    overdue_total = float(ar.get("overdue_total") or 0)

    if max_days >= 90 or late_count >= 3 or (customer.is_stopped and max_days >= 30):
        return "black"
    if max_days >= 60 or (late_count >= 2 and compliance < 55):
        return "black"
    if (
        compliance >= 88
        and max_days == 0
        and overdue_total <= 0
        and (customer.purchase_count or 0) >= 2
        and int(inst.get("overdue_count") or 0) == 0
    ):
        return "excellent"
    return "normal"


def resolve_collection_tier(customer: Customer, *, ar: dict | None = None, inst: dict | None = None) -> dict:
    profile = customer.profile_data or {}
    manual = str(profile.get("collection_tier") or "").strip().lower()
    if manual and manual != "auto" and manual in _TIER_LABELS:
        tier = manual
        source = "manual"
    else:
        group_tier = _tier_from_group(customer.customer_group)
        if group_tier:
            tier = group_tier
            source = "group"
        else:
            ar = ar or _customer_ar_summary(customer)
            inst = inst or _installment_stats(customer.pk)
            tier = _auto_tier(customer=customer, ar=ar, inst=inst)
            source = "auto"

    color = _TIER_COLORS.get(tier, "")
    if source == "group" and customer.customer_group.display_color:
        color = customer.customer_group.display_color
    label = _TIER_LABELS.get(tier, tier)
    if source == "group":
        label = customer.customer_group.name_ar or label

    return {
        "tier": tier,
        "tier_label": label,
        "tier_color": color,
        "tier_source": source,
    }


def pos_customer_review_list(*, search: str = "") -> list[dict]:
    rows = []
    qs = (
        Customer.objects.using(_USING)
        .select_related("customer_type", "customer_group", "assigned_salesperson")
        .filter(is_active=True)
        .order_by("code")
    )
    q = (search or "").strip().lower()
    for c in qs:
        profile = c.profile_data or {}
        spouse = customer_service.profile_spouse(profile)
        guarantor = customer_service.profile_guarantor_summary(profile)
        if q:
            hay = customer_service.profile_search_haystack(c, profile)
            group_name = c.customer_group.name_ar if c.customer_group else ""
            hay = f"{hay} {group_name}".strip()
            if not all(w in hay for w in q.split()):
                continue

        ar = _customer_ar_summary(c)
        inst = _installment_stats(c.pk)
        tier = resolve_collection_tier(c, ar=ar, inst=inst)
        base = customer_service._serialize_customer(c)
        rows.append(
            {
                **base,
                **tier,
                "spouse_name": spouse,
                "guarantor_summary": guarantor,
                "guarantor_name": guarantor,
                "compliance_percent": ar.get("compliance_percent"),
                "max_days_overdue": ar.get("max_days_overdue"),
                "overdue_total": ar.get("overdue_total"),
                "late_installment_count": inst.get("late_count"),
                "open_installment_balance": inst.get("open_installment_balance"),
            }
        )
    return rows[:500]


def pos_customer_open_documents(*, customer_id) -> dict:
    """مستندات العميل المفتوحة + فواتير البيع المكتملة — لتحميلها في شاشة البيع بالباركود."""
    from erp.sale_models import CustomerReservation, Sale, SalesQuotation
    from erp.serializers_pos import SaleSerializer
    from erp.serializers_sales import CustomerReservationSerializer, SalesQuotationSerializer

    if not Customer.objects.using(_USING).filter(pk=customer_id, is_active=True).exists():
        return {"reservations": [], "quotations": [], "sales": []}

    reservations = (
        CustomerReservation.objects.using(_USING)
        .filter(customer_id=customer_id, status=CustomerReservation.Status.ACTIVE)
        .select_related("branch", "warehouse", "customer", "converted_sale")
        .prefetch_related(
            "lines__variant__product",
            "lines__variant__size",
            "lines__variant__color",
            "lines__composite_product",
        )
        .order_by("-created_at")[:20]
    )
    quotations = (
        SalesQuotation.objects.using(_USING)
        .filter(customer_id=customer_id)
        .exclude(
            status__in=[
                SalesQuotation.Status.CONVERTED,
                SalesQuotation.Status.CANCELLED,
            ]
        )
        .select_related("branch", "warehouse", "customer", "converted_sale")
        .prefetch_related(
            "lines__variant__product",
            "lines__variant__size",
            "lines__variant__color",
            "lines__composite_product",
        )
        .order_by("-created_at")[:20]
    )
    sales = (
        Sale.objects.using(_USING)
        .filter(customer_id=customer_id, status=Sale.Status.COMPLETED)
        .select_related("branch", "warehouse", "customer", "created_by")
        .prefetch_related(
            "lines__variant__product",
            "lines__variant__size",
            "lines__variant__color",
            "lines__composite_product",
            "lines__seller",
        )
        .order_by("-created_at")[:20]
    )
    return {
        "reservations": CustomerReservationSerializer(reservations, many=True).data,
        "quotations": SalesQuotationSerializer(quotations, many=True).data,
        "sales": SaleSerializer(sales, many=True).data,
    }
