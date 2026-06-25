# Scan orders — barcode pre-scan for document loading

import uuid
from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0052_sale_return_statement_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="ScanOrder",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=30, unique=True)),
                (
                    "order_type",
                    models.CharField(
                        choices=[
                            ("sale", "بيع"),
                            ("transfer", "تحويل"),
                            ("stock_count", "جرد"),
                            ("purchase_return", "مرتجع مورد"),
                        ],
                        default="sale",
                        max_length=30,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "مسودة"),
                            ("saved", "محفوظ"),
                            ("loaded", "تم التحميل"),
                            ("cancelled", "ملغى"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("line_count", models.PositiveIntegerField(default=0)),
                ("total_quantity", models.DecimalField(decimal_places=3, default=Decimal("0"), max_digits=14)),
                ("total_sale_amount", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("notes", models.TextField(blank=True)),
                ("printed_at", models.DateTimeField(blank=True, null=True)),
                ("loaded_into", models.CharField(blank=True, help_text="نوع المستند الذي حُمّل إليه", max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="scan_orders",
                        to="erp.branch",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="scan_orders_created",
                        to="erp.user",
                    ),
                ),
                (
                    "employee",
                    models.ForeignKey(
                        help_text="البائع / الموظف منشئ الأوردر",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="scan_orders_as_employee",
                        to="erp.user",
                    ),
                ),
                (
                    "supplier",
                    models.ForeignKey(
                        blank=True,
                        help_text="مطلوب لأوردر مرتجع مورد",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="scan_orders",
                        to="erp.supplier",
                    ),
                ),
                (
                    "warehouse",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="scan_orders",
                        to="erp.warehouse",
                    ),
                ),
            ],
            options={
                "verbose_name": "أوردر",
                "verbose_name_plural": "أوردرات",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ScanOrderLine",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("barcode_scanned", models.CharField(blank=True, max_length=80)),
                ("quantity", models.DecimalField(decimal_places=3, default=Decimal("1"), max_digits=14)),
                ("unit_sale_price", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=12)),
                ("line_total", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("scanned_at", models.DateTimeField(auto_now_add=True)),
                (
                    "scan_order",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="erp.scanorder",
                    ),
                ),
                (
                    "variant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="scan_order_lines",
                        to="erp.productvariant",
                    ),
                ),
            ],
            options={
                "verbose_name": "بند أوردر",
                "verbose_name_plural": "بنود الأوردرات",
                "ordering": ["scanned_at"],
            },
        ),
    ]
