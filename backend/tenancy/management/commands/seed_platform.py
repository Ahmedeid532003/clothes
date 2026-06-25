from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from saas.models import Plan


class Command(BaseCommand):
    help = "بذرة الخطط + سوبر أدمن للمنصة"

    def add_arguments(self, parser):
        parser.add_argument("--admin-user", default="admin")
        parser.add_argument("--admin-pass", default="admin123")
        parser.add_argument("--admin-email", default="admin@gmail.com")

    def handle(self, *args, **options):
        plans = [
            {
                "code": "starter",
                "name": "Starter",
                "max_branches": 1,
                "max_users": 5,
                "max_concurrent_users": 2,
                "price_monthly": 0,
            },
            {
                "code": "growth",
                "name": "Growth",
                "max_branches": 3,
                "max_users": 15,
                "max_concurrent_users": 5,
                "price_monthly": 0,
            },
        ]
        for data in plans:
            Plan.objects.update_or_create(code=data["code"], defaults=data)
            self.stdout.write(f"Plan: {data['code']}")

        User = get_user_model()
        username = options["admin_user"]
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username,
                email=options["admin_email"],
                password=options["admin_pass"],
            )
            self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' created."))
        else:
            self.stdout.write(f"Superuser '{username}' already exists.")
