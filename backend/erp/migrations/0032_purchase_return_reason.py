from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0031_purchase_invoice_enhanced"),
    ]

    operations = [
        migrations.AddField(
            model_name="purchaseinvoice",
            name="return_reason",
            field=models.CharField(
                blank=True,
                choices=[
                    ("defect", "عيب / تالف"),
                    ("wrong_size", "مقاس غلط"),
                    ("wrong_color", "لون غلط"),
                    ("excess_qty", "زيادة كمية"),
                    ("bad_quality", "خامة سيئة"),
                    ("other", "سبب آخر"),
                ],
                default="",
                max_length=30,
            ),
        ),
    ]
