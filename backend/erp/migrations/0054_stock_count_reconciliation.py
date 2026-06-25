# Stock count reconciliation — filters, order mode, adjustment vouchers

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0053_scan_orders"),
    ]

    operations = [
        migrations.AddField(
            model_name="stockcount",
            name="branch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_counts",
                to="erp.branch",
            ),
        ),
        migrations.AddField(
            model_name="stockcount",
            name="count_mode",
            field=models.CharField(
                choices=[("filter", "حسب الفلتر"), ("order", "أصناف الأوردر فقط")],
                default="filter",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="stockcount",
            name="scan_order",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_counts",
                to="erp.scanorder",
            ),
        ),
        migrations.AddField(
            model_name="stockcount",
            name="supplier_group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_counts",
                to="erp.suppliergroup",
            ),
        ),
        migrations.AddField(
            model_name="stockcount",
            name="section",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_counts",
                to="erp.productsection",
            ),
        ),
        migrations.AddField(
            model_name="stockcount",
            name="brand",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_counts",
                to="erp.brand",
            ),
        ),
        migrations.AddField(
            model_name="stockcount",
            name="classification",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_counts",
                to="erp.productclassification",
            ),
        ),
        migrations.AddField(
            model_name="stockcount",
            name="product",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_counts",
                to="erp.product",
            ),
        ),
        migrations.AddField(
            model_name="stockcount",
            name="addition_voucher",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="source_stock_counts",
                to="erp.stockaddition",
            ),
        ),
        migrations.AddField(
            model_name="stockcount",
            name="disbursement_voucher",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="source_stock_counts",
                to="erp.stockdisbursement",
            ),
        ),
    ]
