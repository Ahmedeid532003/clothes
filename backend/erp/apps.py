from django.apps import AppConfig


class ErpConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "erp"
    verbose_name = "ERP"

    def ready(self):
        from django.db.models.signals import post_save

        from erp.models import Branch
        from erp.services import branches as branch_service

        def _ensure_branch_pos(sender, instance, **kwargs):
            using = kwargs.get("using") or "default"
            if using != "tenant":
                return
            branch_service.ensure_branch_sale_warehouse(instance)

        post_save.connect(_ensure_branch_pos, sender=Branch, dispatch_uid="erp_branch_sale_warehouse")
