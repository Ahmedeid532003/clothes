# Supplier contact person — name & job title

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0043_supplier_payment_paper_link"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="contact_name",
            field=models.CharField(blank=True, help_text="اسم الشخص المسئول", max_length=200),
        ),
        migrations.AddField(
            model_name="supplier",
            name="contact_title",
            field=models.CharField(blank=True, help_text="المسمى الوظيفي", max_length=120),
        ),
    ]
