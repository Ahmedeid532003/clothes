from django.core.management.base import BaseCommand

from saas.models import GlobalUsername, Tenant


class Command(BaseCommand):
    help = "نسخ owner_username من GlobalUsername للمنشآت القديمة"

    def handle(self, *args, **options):
        for tenant in Tenant.objects.filter(owner_username=""):
            gu = GlobalUsername.objects.filter(tenant=tenant).first()
            if gu:
                tenant.owner_username = gu.username
                tenant.save(update_fields=["owner_username", "updated_at"])
                self.stdout.write(f"{tenant.slug} → {gu.username}")
        self.stdout.write(self.style.SUCCESS("Done."))
