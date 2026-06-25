# Generated manually for Okazion notice lines + branch offer prices

import uuid
from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0049_purchase_orders"),
    ]

    operations = [
        migrations.CreateModel(
            name="OkazionNoticeLine",
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
                    "qty",
                    models.DecimalField(
                        decimal_places=3, default=Decimal("0"), max_digits=14
                    ),
                ),
                ("mode", models.CharField(default="percent", max_length=20)),
                (
                    "value",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("0"), max_digits=12
                    ),
                ),
                (
                    "markup_percent",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("0"), max_digits=6
                    ),
                ),
                (
                    "old_purchase_price",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("0"), max_digits=12
                    ),
                ),
                (
                    "new_purchase_price",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("0"), max_digits=12
                    ),
                ),
                (
                    "old_sale_price",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("0"), max_digits=12
                    ),
                ),
                (
                    "new_offer_price",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("0"), max_digits=12
                    ),
                ),
                (
                    "total_discount_value",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("0"), max_digits=14
                    ),
                ),
                ("excluded", models.BooleanField(default=False)),
                (
                    "notice",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="okazion_lines",
                        to="erp.priceadjustment",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="okazion_lines",
                        to="erp.product",
                    ),
                ),
            ],
            options={
                "verbose_name": "بند أوكازيون",
                "verbose_name_plural": "بنود أوكازيون",
            },
        ),
        migrations.CreateModel(
            name="BranchOfferPrice",
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
                    "offer_price",
                    models.DecimalField(decimal_places=2, max_digits=12),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="branch_offer_prices",
                        to="erp.branch",
                    ),
                ),
                (
                    "notice",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="branch_offers",
                        to="erp.priceadjustment",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="branch_offer_prices",
                        to="erp.product",
                    ),
                ),
            ],
            options={
                "verbose_name": "سعر عرض فرع",
                "verbose_name_plural": "أسعار عرض الفروع",
                "unique_together": {("branch", "product")},
            },
        ),
        migrations.AddIndex(
            model_name="okazionnoticeline",
            index=models.Index(
                fields=["notice", "product"], name="erp_okazion_notice_product_idx"
            ),
        ),
    ]
