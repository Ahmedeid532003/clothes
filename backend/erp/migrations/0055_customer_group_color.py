# Customer group display color for POS/CRM tables

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0054_stock_count_reconciliation"),
    ]

    operations = [
        migrations.AddField(
            model_name="customergroup",
            name="display_color",
            field=models.CharField(
                default="#4F46E5",
                help_text="لون عرض المجموعة في جداول العملاء",
                max_length=7,
            ),
        ),
    ]
