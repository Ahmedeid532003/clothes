from django.core.management.base import BaseCommand

from saas.subscription_policy import enforce_all_tenant_subscriptions


class Command(BaseCommand):
    help = "تجميد المنشآت منتهية الاشتراك وتفعيل من جدد اشتراكه (حسب ends_at + grace_days)."

    def handle(self, *args, **options):
        stats = enforce_all_tenant_subscriptions()
        self.stdout.write(
            self.style.SUCCESS(
                f"Checked {stats['checked']} tenants — "
                f"frozen: {stats['frozen']}, activated: {stats['activated']}"
            )
        )
