"""سياق مشترك لقوالب Django Admin."""

from saas.subscription_alerts import get_admin_alerts_summary, get_admin_subscription_alerts


def admin_subscription_notifications(request):
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return {}
    if not request.user.is_staff:
        return {}
    if not request.path.startswith("/admin/"):
        return {}

    alerts = get_admin_subscription_alerts()
    return {
        "admin_subscription_alerts": alerts,
        "admin_subscription_summary": get_admin_alerts_summary(alerts),
    }
