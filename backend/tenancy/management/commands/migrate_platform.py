from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "ترحيل قاعدة المنصة MainClothes فقط (بدون ERP)"

    def handle(self, *args, **options):
        for app in ("contenttypes", "auth", "admin", "sessions", "saas"):
            call_command("migrate", app, database="default", verbosity=1)
        self.stdout.write(self.style.SUCCESS("Platform migrations done."))
