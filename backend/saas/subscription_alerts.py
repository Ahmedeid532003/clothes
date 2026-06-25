"""تنبيهات انتهاء الاشتراك للأدمن وللمستأجر."""

from __future__ import annotations

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from saas.models import Subscription, Tenant
from saas.subscription_policy import (
    evaluate_tenant_subscription,
    get_current_subscription,
    subscription_deadline,
)

# عدد الأيام قبل ends_at لبدء التنبيه
WARN_DAYS = 14
CRITICAL_DAYS = 7
# عرض شريط معلومات خفيف للاشتراك الساري (يظهر في كل الشاشات)
INFO_BANNER_DAYS = 30


def _days_between(start, end) -> int:
    return (end - start).days


def build_subscription_alert(tenant: Tenant, *, evaluate: bool = True) -> dict | None:
    """
    معلومات الاشتراك للواجهة (tenant ERP + أدمن).
    يرجع None إذا لا يوجد اشتراك حالي.
    """
    if evaluate:
        evaluate_tenant_subscription(tenant)
        tenant.refresh_from_db(fields=["status"])

    sub = get_current_subscription(tenant)
    if not sub:
        return {
            "status": "none",
            "show_banner": False,
            "plan_name": "",
            "ends_at": None,
            "grace_days": 0,
            "deadline": None,
            "days_until_end": None,
            "days_until_deadline": None,
            "is_frozen": tenant.status == Tenant.Status.FROZEN,
            "tenant_status": tenant.status,
            "message_ar": "لا يوجد اشتراك مسجّل لهذه المنشأة.",
            "message_en": "No active subscription on file for this tenant.",
        }

    today = timezone.localdate()
    ends_at = sub.ends_at
    deadline = subscription_deadline(sub)
    days_until_end = _days_between(today, ends_at)
    days_until_deadline = _days_between(today, deadline)
    is_frozen = tenant.status == Tenant.Status.FROZEN

    if is_frozen or days_until_deadline < 0:
        status = "frozen"
        message_ar = (
            f"تم تجميد الحساب — انتهى الاشتراك في {ends_at.strftime('%Y-%m-%d')}. "
            f"يرجى تجديد الاشتراك والتواصل مع الدعم."
        )
        message_en = "Account frozen — subscription expired. Please renew and contact support."
        show_banner = True
    elif today > ends_at:
        status = "grace"
        message_ar = (
            f"انتهى الاشتراك في {ends_at.strftime('%Y-%m-%d')} — فترة سماح "
            f"{sub.grace_days} يوم/أيام. آخر يوم مسموح: {deadline.strftime('%Y-%m-%d')} "
            f"(متبقي {max(days_until_deadline, 0)} يوم)."
        )
        message_en = (
            f"Subscription ended on {ends_at}; grace period until {deadline} "
            f"({max(days_until_deadline, 0)} day(s) left)."
        )
        show_banner = True
    elif days_until_end <= CRITICAL_DAYS:
        status = "critical"
        message_ar = (
            f"اشتراككم ينتهي قريباً — تاريخ الانتهاء: {ends_at.strftime('%Y-%m-%d')} "
            f"(متبقي {days_until_end} يوم). يرجى التجديد لتجنب التجميد."
        )
        message_en = (
            f"Subscription ends soon on {ends_at} ({days_until_end} day(s) left). "
            f"Please renew to avoid suspension."
        )
        show_banner = True
    elif days_until_end <= WARN_DAYS:
        status = "warning"
        message_ar = (
            f"اشتراككم ينتهي في {ends_at.strftime('%Y-%m-%d')} — متبقي {days_until_end} يوم."
        )
        message_en = f"Subscription ends on {ends_at} — {days_until_end} day(s) remaining."
        show_banner = True
    else:
        status = "ok"
        message_ar = (
            f"الاشتراك ساري حتى {ends_at.strftime('%Y-%m-%d')} (متبقي {days_until_end} يوم)."
        )
        message_en = f"Subscription active until {ends_at} ({days_until_end} days left)."
        show_banner = days_until_end <= INFO_BANNER_DAYS

    return {
        "status": status,
        "show_banner": show_banner,
        "plan_name": sub.plan.name,
        "ends_at": ends_at.isoformat(),
        "grace_days": sub.grace_days,
        "deadline": deadline.isoformat(),
        "days_until_end": days_until_end,
        "days_until_deadline": days_until_deadline,
        "is_frozen": is_frozen,
        "tenant_status": tenant.status,
        "message_ar": message_ar,
        "message_en": message_en,
    }


def get_admin_subscription_alerts(*, warn_days: int = WARN_DAYS) -> list[dict]:
    """قائمة تنبيهات للوحة تحكم الأدمن."""
    today = timezone.localdate()
    horizon = today + timedelta(days=warn_days)
    alerts: list[dict] = []

    subs = (
        Subscription.objects.filter(is_current=True)
        .select_related("tenant", "plan")
        .order_by("ends_at")
    )

    for sub in subs:
        tenant = sub.tenant
        evaluate_tenant_subscription(tenant)
        tenant.refresh_from_db(fields=["status"])

        ends_at = sub.ends_at
        deadline = subscription_deadline(sub)
        days_until_end = _days_between(today, ends_at)
        days_until_deadline = _days_between(today, deadline)
        info = build_subscription_alert(tenant, evaluate=False)
        if not info:
            continue

        include = (
            tenant.status == Tenant.Status.FROZEN
            or days_until_deadline < 0
            or today > ends_at
            or ends_at <= horizon
        )
        if not include:
            continue

        try:
            admin_url = reverse("admin:saas_tenant_change", args=[tenant.pk])
        except Exception:
            admin_url = ""

        alerts.append(
            {
                "tenant_id": str(tenant.pk),
                "tenant_name": tenant.name,
                "tenant_slug": tenant.slug,
                "tenant_status": tenant.status,
                "plan_name": sub.plan.name,
                "ends_at": ends_at,
                "deadline": deadline,
                "grace_days": sub.grace_days,
                "days_until_end": days_until_end,
                "days_until_deadline": days_until_deadline,
                "level": info["status"],
                "message_ar": info["message_ar"],
                "admin_url": admin_url,
            }
        )

    alerts.sort(key=lambda a: (a["days_until_deadline"], a["tenant_name"]))
    return alerts


def get_admin_alerts_summary(alerts: list[dict] | None = None) -> dict:
    """ملخص سريع لشريط التنبيهات في الأدمن."""
    alerts = alerts if alerts is not None else get_admin_subscription_alerts()
    return {
        "total": len(alerts),
        "frozen": sum(1 for a in alerts if a["level"] == "frozen"),
        "grace": sum(1 for a in alerts if a["level"] == "grace"),
        "critical": sum(1 for a in alerts if a["level"] == "critical"),
        "warning": sum(1 for a in alerts if a["level"] == "warning"),
    }
