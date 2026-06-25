from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0066_cash_shift_received_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="jobtitle",
            name="job_level",
            field=models.CharField(default="B", help_text="المستوى الوظيفي: A, B, C…", max_length=10),
        ),
        migrations.AddField(
            model_name="employeegroup",
            name="color",
            field=models.CharField(default="blue", help_text="لون التصنيف في الواجهة", max_length=20),
        ),
        migrations.AddField(
            model_name="allowanceitem",
            name="default_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="deductionitem",
            name="default_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
    ]
