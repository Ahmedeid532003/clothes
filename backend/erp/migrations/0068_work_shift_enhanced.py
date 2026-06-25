from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0067_hr_job_structure_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="workshift",
            name="name_en",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AddField(
            model_name="workshift",
            name="period_count",
            field=models.PositiveSmallIntegerField(default=1),
        ),
    ]
