from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0071_official_holiday_optional_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancerecord",
            name="periods",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
