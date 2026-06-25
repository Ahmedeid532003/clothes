# Generated manually for purchase orders (reorder workflow)

import uuid
from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0048_supplier_is_also_customer_db_default"),
    ]

    operations = [
        migrations.CreateModel(
            name="PurchaseOrder",
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
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "مسودة"),
                            ("sent", "مُرسل للمورد"),
                            ("partial", "استلام جزئي"),
                            ("received", "مستلم بالكامل"),
                            ("cancelled", "ملغى"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("whatsapp_sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "season",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="purchase_orders",
                        to="erp.season",
                    ),
                ),
                (
                    "sent_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="purchase_orders_sent",
                        to="erp.user",
                    ),
                ),
                (
                    "supplier",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="purchase_orders",
                        to="erp.supplier",
                    ),
                ),
            ],
            options={
                "verbose_name": "أمر شراء",
                "verbose_name_plural": "أوامر الشراء",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="PurchaseOrderLine",
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
                (
                    "quantity_ordered",
                    models.DecimalField(
                        decimal_places=3, default=Decimal("0"), max_digits=14
                    ),
                ),
                (
                    "quantity_received",
                    models.DecimalField(
                        decimal_places=3, default=Decimal("0"), max_digits=14
                    ),
                ),
                (
                    "unit_price",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("0"), max_digits=12
                    ),
                ),
                ("notes", models.CharField(blank=True, max_length=300)),
                (
                    "order",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="erp.purchaseorder",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="purchase_order_lines",
                        to="erp.product",
                    ),
                ),
            ],
            options={
                "verbose_name": "بند أمر شراء",
                "verbose_name_plural": "بنود أوامر الشراء",
            },
        ),
    ]
