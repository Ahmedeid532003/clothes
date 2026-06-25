from django.apps import AppConfig


class SaasConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "saas"
    verbose_name = "SaaS Platform"

    def ready(self):
        import saas.signals  # noqa: F401
        from saas.admin_dashboard import patch_admin_index

        patch_admin_index()
