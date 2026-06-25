from django.db import migrations, models


def copy_plan_modules_to_tenants(apps, schema_editor):
    Tenant = apps.get_model("saas", "Tenant")
    for tenant in Tenant.objects.select_related("plan").iterator():
        plan_modules = getattr(tenant.plan, "modules", None) or []
        if plan_modules and not tenant.modules:
            tenant.modules = plan_modules
            tenant.save(update_fields=["modules"])


class Migration(migrations.Migration):

    dependencies = [
        ("saas", "0004_tenant_db_initial_password"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="modules",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="الموديولات التي يرىها المستخدمون في النظام",
                verbose_name="الموديولات المفعّلة",
            ),
        ),
        migrations.RunPython(copy_plan_modules_to_tenants, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="plan",
            name="modules",
        ),
    ]
