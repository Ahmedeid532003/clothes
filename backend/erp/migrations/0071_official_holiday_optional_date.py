from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0070_employee_profile_files"),
    ]

    operations = [
        migrations.AlterField(
            model_name="officialholiday",
            name="holiday_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
