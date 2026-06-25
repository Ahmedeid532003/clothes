# Generated manually — أذون الصرف والإضافة

import django.db.models.deletion
import uuid
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0028_saleline_composite"),
    ]

    operations = [
        migrations.CreateModel(
            name="StockDisbursement",
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
                    "purpose",
                    models.CharField(
                        choices=[
                            ("sale", "بيع"),
                            ("sample", "عينة"),
                            ("internal_use", "استخدام داخلي"),
                            ("other", "أخرى"),
                        ],
                        max_length=30,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "مسودة"),
                            ("approved", "معتمد"),
                            ("cancelled", "ملغى"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="disbursements_created",
                        to="erp.user",
                    ),
                ),
                (
                    "warehouse",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="disbursements",
                        to="erp.warehouse",
                    ),
                ),
            ],
            options={
                "verbose_name": "إذن صرف",
                "verbose_name_plural": "أذون الصرف",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="StockAddition",
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
                    "purpose",
                    models.CharField(
                        choices=[
                            ("supplier_purchase", "شراء من المورد"),
                            ("customer_return", "مرتجع من عميل"),
                            ("other", "أخرى"),
                        ],
                        max_length=30,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "مسودة"),
                            ("approved", "معتمد"),
                            ("cancelled", "ملغى"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="additions_created",
                        to="erp.user",
                    ),
                ),
                (
                    "warehouse",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="additions",
                        to="erp.warehouse",
                    ),
                ),
            ],
            options={
                "verbose_name": "إذن إضافة",
                "verbose_name_plural": "أذون الإضافة",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="StockDisbursementLine",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "quantity",
                    models.DecimalField(
                        decimal_places=3, default=Decimal("1"), max_digits=14
                    ),
                ),
                (
                    "disbursement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="erp.stockdisbursement",
                    ),
                ),
                (
                    "variant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to="erp.productvariant",
                    ),
                ),
            ],
            options={
                "verbose_name": "بند صرف",
                "verbose_name_plural": "بنود الصرف",
            },
        ),
        migrations.CreateModel(
            name="StockAdditionLine",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "quantity",
                    models.DecimalField(
                        decimal_places=3, default=Decimal("1"), max_digits=14
                    ),
                ),
                (
                    "addition",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="erp.stockaddition",
                    ),
                ),
                (
                    "variant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to="erp.productvariant",
                    ),
                ),
            ],
            options={
                "verbose_name": "بند إضافة",
                "verbose_name_plural": "بنود الإضافة",
            },
        ),
    ]
