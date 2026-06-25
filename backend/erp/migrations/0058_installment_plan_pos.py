from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0057_pos_exchange_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="installmentplantemplate",
            name="period_unit",
            field=models.CharField(
                choices=[("days", "أيام"), ("months", "أشهر")],
                default="months",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="installmentplantemplate",
            name="interval_days",
            field=models.PositiveSmallIntegerField(
                default=30,
                help_text="الفترة بالأيام عند اختيار تقسيط يومي",
            ),
        ),
        migrations.AddField(
            model_name="installmentplantemplate",
            name="penalty_day_of_month",
            field=models.PositiveSmallIntegerField(
                default=15,
                help_text="يوم إضافة غرامة التأخير من الشهر التالي",
            ),
        ),
        migrations.AddField(
            model_name="installmentplantemplate",
            name="show_interest_on_receipt",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="installmentplantemplate",
            name="show_penalty_on_receipt",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="installmentcontract",
            name="sale",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="installment_contracts",
                to="erp.sale",
            ),
        ),
    ]
