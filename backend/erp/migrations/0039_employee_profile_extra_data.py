from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0038_installment_plans_payment_dashboard"),
    ]

    operations = [
        migrations.AddField(
            model_name="employeeprofile",
            name="extra_data",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
