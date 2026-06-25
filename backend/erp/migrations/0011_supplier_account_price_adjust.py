# Generated manually for supplier account + purchase price adjustments

import uuid
from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0010_product_settings_barcode"),
    ]

    operations = [
        migrations.AlterField(
            model_name="priceadjustment",
            name="target",
            field=models.CharField(
                choices=[
                    ("sale", "سعر البيع"),
                    ("offer", "سعر العرض"),
                    ("purchase", "سعر التكلفة"),
                ],
                default="sale",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="priceadjustment",
            name="supplier_account_amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="صافي أثر التعديل على حساب المورد (موجب = زيادة المديونية)",
                max_digits=14,
                null=True,
            ),
        ),
        migrations.CreateModel(
            name="SupplierAccountEntry",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("code", models.CharField(max_length=30, unique=True)),
                (
                    "entry_type",
                    models.CharField(
                        choices=[
                            ("debit", "مدين — زيادة المديونية للمورد"),
                            ("credit", "دائن — تخفيض المديونية / رصيد لصالح المحل"),
                        ],
                        max_length=10,
                    ),
                ),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("0"), max_digits=14
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "price_adjustment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="supplier_entries",
                        to="erp.priceadjustment",
                    ),
                ),
                (
                    "supplier",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="account_entries",
                        to="erp.supplier",
                    ),
                ),
            ],
            options={
                "verbose_name": "حركة حساب مورد",
                "verbose_name_plural": "حركات حسابات الموردين",
                "ordering": ["-created_at"],
            },
        ),
    ]
