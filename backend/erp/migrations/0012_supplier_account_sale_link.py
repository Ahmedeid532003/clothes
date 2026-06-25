# Link supplier account entries to POS sales

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0011_supplier_account_price_adjust"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplieraccountentry",
            name="sale",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="supplier_entries",
                to="erp.sale",
            ),
        ),
    ]
