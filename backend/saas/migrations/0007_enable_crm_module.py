"""Enable CRM module for tenants/plans that already have inventory."""

from django.db import migrations


def _append_crm(modules: list) -> list:
    mods = list(modules or [])
    if not mods:
        return mods
    if "inventory" in mods and "crm" not in mods:
        mods.append("crm")
    return mods


def enable_crm_for_inventory_tenants(apps, schema_editor):
    Tenant = apps.get_model("saas", "Tenant")
    for tenant in Tenant.objects.all():
        new_modules = _append_crm(tenant.modules)
        if new_modules != (tenant.modules or []):
            tenant.modules = new_modules
            tenant.save(update_fields=["modules"])


class Migration(migrations.Migration):
    dependencies = [
        ("saas", "0006_paymentrecord_renewal_months"),
    ]

    operations = [
        migrations.RunPython(enable_crm_for_inventory_tenants, migrations.RunPython.noop),
    ]
