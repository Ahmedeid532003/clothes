from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0069_payroll_statement"),
    ]

    operations = [
        migrations.AddField(
            model_name="employeeprofile",
            name="photo",
            field=models.ImageField(blank=True, null=True, upload_to="employees/photos/%Y/%m/"),
        ),
        migrations.AddField(
            model_name="employeeprofile",
            name="id_card_file",
            field=models.FileField(blank=True, null=True, upload_to="employees/id_cards/%Y/%m/"),
        ),
        migrations.AddField(
            model_name="employeeprofile",
            name="id_card_filename",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
