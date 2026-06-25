from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0003_hr_department_and_user_permissions"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="branch_access_mode",
            field=models.CharField(
                choices=[
                    ("single", "Single branch"),
                    ("multiple", "Multiple branches"),
                    ("all", "All branches"),
                ],
                default="all",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="allowed_branches",
            field=models.ManyToManyField(
                blank=True,
                related_name="allowed_users",
                to="erp.branch",
            ),
        ),
    ]
