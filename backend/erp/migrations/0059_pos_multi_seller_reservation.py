from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0058_installment_plan_pos"),
    ]

    operations = [
        migrations.AddField(
            model_name="inventorysettings",
            name="pos_allow_multiple_sellers",
            field=models.BooleanField(
                default=True,
                help_text="السماح بعدة بائعين في فاتورة نقطة البيع الواحدة",
            ),
        ),
        migrations.AlterField(
            model_name="customerreservation",
            name="customer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="reservations",
                to="erp.customer",
            ),
        ),
    ]
