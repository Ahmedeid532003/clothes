from django.apps import AppConfig


class TenancyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tenancy"

    def ready(self) -> None:
        from django.conf import settings
        from django.db import connections

        if getattr(settings, "CLOUD_SHARED_DB", False):
            connections.databases.setdefault(
                "tenant",
                connections.databases["default"].copy(),
            )
