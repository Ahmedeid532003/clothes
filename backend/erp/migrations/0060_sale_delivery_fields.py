from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0059_pos_multi_seller_reservation"),
    ]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="is_delivery",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="sale",
            name="delivery_fee",
            field=models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14),
        ),
        migrations.AddField(
            model_name="sale",
            name="delivery_agent",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="delivery_sales",
                to="erp.user",
            ),
        ),
        migrations.AddField(
            model_name="sale",
            name="delivery_status",
            field=models.CharField(
                blank=True,
                choices=[
                    ("pending", "قيد التوصيل"),
                    ("delivered", "تم التوصيل"),
                    ("cancelled", "ملغاة"),
                ],
                default="",
                max_length=20,
            ),
        ),
    ]
