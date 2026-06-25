from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0039_employee_profile_extra_data"),
    ]

    operations = [
        migrations.AddField(
            model_name="department",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="department",
            name="manager_name",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="department",
            name="operational_budget",
            field=models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=14),
        ),
    ]
