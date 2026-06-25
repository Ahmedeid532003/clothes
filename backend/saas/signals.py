from django.db.models.signals import post_save
from django.dispatch import receiver

from saas.models import Subscription
from saas.subscription_policy import evaluate_tenant_subscription


@receiver(post_save, sender=Subscription)
def sync_tenant_status_on_subscription_change(sender, instance, **kwargs):
    if instance.tenant_id:
        evaluate_tenant_subscription(instance.tenant)
