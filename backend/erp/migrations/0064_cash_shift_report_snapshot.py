from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0063_sale_cash_shift"),
    ]

    operations = [
        migrations.AddField(
            model_name="cashshift",
            name="report_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="cashshift",
            name="handover_receipt_code",
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
