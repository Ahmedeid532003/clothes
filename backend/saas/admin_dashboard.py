"""إحصائيات لوحة تحكم Django Admin."""

from __future__ import annotations

from datetime import timedelta

from django.contrib import admin
from django.utils import timezone

from saas.models import Plan, Subscription, Tenant
from saas.revenue_dashboard import get_revenue_summary
from saas.subscription_alerts import get_admin_alerts_summary, get_admin_subscription_alerts


def get_admin_stats() -> dict:
    today = timezone.localdate()
    soon = today + timedelta(days=7)
    stats = {
        "total_tenants": Tenant.objects.count(),
        "active_tenants": Tenant.objects.filter(status=Tenant.Status.ACTIVE).count(),
        "frozen_tenants": Tenant.objects.filter(status=Tenant.Status.FROZEN).count(),
        "provisioning_tenants": Tenant.objects.filter(
            status=Tenant.Status.PROVISIONING
        ).count(),
        "active_plans": Plan.objects.filter(is_active=True).count(),
        "expiring_soon": Subscription.objects.filter(
            is_current=True,
            ends_at__gte=today,
            ends_at__lte=soon,
        ).count(),
    }
    stats.update(get_revenue_summary())
    return stats


def patch_admin_index():
    """يمرّر إحصائيات ومسارات مخصصة للصفحة الرئيسية في الأدمن."""

    from saas.revenue_dashboard import patch_admin_revenue

    patch_admin_revenue()

    site = admin.site
    original_index = site.index

    def index(request, extra_context=None):
        context = dict(extra_context or {})
        context["admin_stats"] = get_admin_stats()
        alerts = get_admin_subscription_alerts()
        context["admin_subscription_alerts"] = alerts
        context["admin_subscription_summary"] = get_admin_alerts_summary(alerts)
        return original_index(request, context)

    site.index = index

    original_each_context = site.each_context

    def each_context(request):
        context = original_each_context(request)
        if getattr(request, "user", None) and request.user.is_authenticated and request.user.is_staff:
            if request.path.startswith("/admin/"):
                alerts = get_admin_subscription_alerts()
                context["admin_subscription_alerts"] = alerts
                context["admin_subscription_summary"] = get_admin_alerts_summary(alerts)
        return context

    site.each_context = each_context
