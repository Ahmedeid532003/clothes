# Stock transfer types + branch links + approval setting

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0012_supplier_account_sale_link"),
    ]

    operations = [
        migrations.AddField(
            model_name="inventorysettings",
            name="transfer_requires_approval",
            field=models.BooleanField(
                default=True,
                help_text="إذون التحويل تحتاج اعتماد مدير افتراضياً",
            ),
        ),
        migrations.AddField(
            model_name="stocktransfer",
            name="transfer_type",
            field=models.CharField(
                choices=[
                    ("warehouse_warehouse", "مخزن → مخزن"),
                    ("warehouse_branch", "مخزن → منفذ بيع"),
                    ("branch_branch", "منفذ بيع → منفذ بيع"),
                ],
                default="warehouse_warehouse",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="stocktransfer",
            name="from_branch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="transfers_out_branch",
                to="erp.branch",
            ),
        ),
        migrations.AddField(
            model_name="stocktransfer",
            name="to_branch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="transfers_in_branch",
                to="erp.branch",
            ),
        ),
    ]
