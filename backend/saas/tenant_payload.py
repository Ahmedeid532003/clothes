from saas.models import Tenant
from saas.subscription_alerts import build_subscription_alert


def tenant_api_payload(tenant: Tenant) -> dict:
    subscription = build_subscription_alert(tenant, evaluate=True)
    return {
        "slug": tenant.slug,
        "name": tenant.name,
        "modules": tenant.modules or [],
        "subscription": subscription,
    }
