# Generated manually — store offer notice lines

import uuid
from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0050_okazion_notice_models"),
    ]

    operations = [
        migrations.CreateModel(
            name="StoreOfferNoticeLine",
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
                        related_name="store_offer_lines",
                        to="erp.priceadjustment",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="store_offer_lines",
                        to="erp.product",
                    ),
                ),
            ],
            options={
                "verbose_name": "بند عرض عام",
                "verbose_name_plural": "بنود العروض العامة",
            },
        ),
        migrations.AddIndex(
            model_name="storeoffernoticeline",
            index=models.Index(
                fields=["notice", "product"], name="erp_store_offer_notice_prod_idx"
            ),
        ),
    ]
