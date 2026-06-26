# Ensure each branch has exactly one auto sale-outlet warehouse

from django.db import migrations


def sync_branch_warehouses(apps, schema_editor):
    from django.conf import settings

    if getattr(settings, "CLOUD_SHARED_DB", False):
        return
    from erp.services import branches as branch_service

    branch_service.sync_all_branch_sale_warehouses()


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0013_stock_transfer_branches"),
    ]

    operations = [
        migrations.RunPython(sync_branch_warehouses, migrations.RunPython.noop),
    ]
