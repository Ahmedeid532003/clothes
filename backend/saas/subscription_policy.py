"""تجميد/تفعيل المنشآت تلقائياً حسب تاريخ نهاية الاشتراك وأيام السماح."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from saas.models import Subscription, Tenant


def subscription_deadline(subscription: Subscription):
    """آخر يوم مسموح (شامل): ends_at + grace_days. grace_days=0 → ينتهي في ends_at."""
    return subscription.ends_at + timedelta(days=subscription.grace_days)


def get_current_subscription(tenant: Tenant) -> Subscription | None:
    return (
        tenant.subscriptions.filter(is_current=True)
        .select_related("plan")
        .order_by("-ends_at")
        .first()
    )


def is_subscription_expired(tenant: Tenant, on_date=None) -> bool:
    sub = get_current_subscription(tenant)
    if not sub:
        return False
    today = on_date or timezone.localdate()
    return today > subscription_deadline(sub)


def evaluate_tenant_subscription(tenant: Tenant, *, save: bool = True) -> str | None:
    """
    يحدّث حالة المنشأة حسب الاشتراك الحالي.
    يرجع: 'frozen' | 'activated' | None
    """
    if tenant.status in (Tenant.Status.SUSPENDED, Tenant.Status.PROVISIONING):
        return None

    sub = get_current_subscription(tenant)
    if not sub:
        return None

    today = timezone.localdate()
    expired = today > subscription_deadline(sub)

    if expired and tenant.status == Tenant.Status.ACTIVE:
        tenant.status = Tenant.Status.FROZEN
        if save:
            tenant.save(update_fields=["status", "updated_at"])
        return "frozen"

    if not expired and tenant.status == Tenant.Status.FROZEN:
        tenant.status = Tenant.Status.ACTIVE
        if save:
            tenant.save(update_fields=["status", "updated_at"])
        return "activated"

    return None


def renew_subscription(tenant: Tenant, *, days: int = 30, save: bool = True) -> Subscription | None:
    """
    يمدّد الاشتراك الحالي من max(ends_at, اليوم) + days.
    يُستخدم عند التفعيل اليدوي من الأدمن.
    """
    sub = get_current_subscription(tenant)
    if not sub:
        return None
    today = timezone.localdate()
    base = max(sub.ends_at, today)
    sub.ends_at = base + timedelta(days=days)
    if save:
        sub.save(update_fields=["ends_at"])
    return sub


def extend_subscription_months(
    tenant: Tenant, months: int, *, save: bool = True
) -> Subscription | None:
    """يمدّد ends_at بعدد شهور تقويمية من max(ends_at, اليوم)."""
    from saas.billing import add_calendar_months

    sub = get_current_subscription(tenant)
    if not sub:
        return None
    months = max(1, int(months))
    today = timezone.localdate()
    base = max(sub.ends_at, today)
    sub.ends_at = add_calendar_months(base, months)
    if save:
        sub.save(update_fields=["ends_at"])
    return sub


def enforce_all_tenant_subscriptions() -> dict[str, int]:
    stats = {"frozen": 0, "activated": 0, "checked": 0}
    for tenant in Tenant.objects.prefetch_related("subscriptions"):
        stats["checked"] += 1
        result = evaluate_tenant_subscription(tenant)
        if result == "frozen":
            stats["frozen"] += 1
        elif result == "activated":
            stats["activated"] += 1
    return stats
