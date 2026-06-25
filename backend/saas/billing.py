"""حساب مبالغ الاشتراك وتمديد التواريخ."""

from __future__ import annotations

import calendar
from datetime import date
from decimal import Decimal

from django.utils import timezone

from saas.models import Tenant
from saas.subscription_policy import get_current_subscription


def add_calendar_months(source: date, months: int) -> date:
    month_index = source.month - 1 + months
    year = source.year + month_index // 12
    month = month_index % 12 + 1
    last_day = calendar.monthrange(year, month)[1]
    day = min(source.day, last_day)
    return date(year, month, day)


def get_tenant_plan(tenant: Tenant):
    sub = get_current_subscription(tenant)
    if sub:
        return sub.plan
    return tenant.plan


def get_monthly_price(tenant: Tenant) -> Decimal:
    return get_tenant_plan(tenant).price_monthly


def compute_payment_amount(tenant: Tenant, months: int) -> Decimal:
    months = max(1, int(months))
    return get_monthly_price(tenant) * months


def preview_subscription_end(tenant: Tenant, months: int) -> date | None:
    sub = get_current_subscription(tenant)
    if not sub:
        return None
    today = timezone.localdate()
    base = max(sub.ends_at, today)
    return add_calendar_months(base, months)


def get_tenant_billing_payload(tenant: Tenant, months: int = 1) -> dict:
    months = max(1, min(60, int(months)))
    plan = get_tenant_plan(tenant)
    sub = get_current_subscription(tenant)
    monthly = get_monthly_price(tenant)
    total = compute_payment_amount(tenant, months)
    new_ends = preview_subscription_end(tenant, months)

    return {
        "tenant_name": tenant.name,
        "tenant_slug": tenant.slug,
        "plan_name": plan.name,
        "plan_code": plan.code,
        "price_monthly": str(monthly),
        "amount_total": str(total),
        "renewal_months": months,
        "has_subscription": sub is not None,
        "current_ends_at": sub.ends_at.isoformat() if sub else None,
        "new_ends_at": new_ends.isoformat() if new_ends else None,
    }
