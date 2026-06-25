from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("saas", "0005_tenant_modules"),
    ]

    operations = [
        migrations.AddField(
            model_name="paymentrecord",
            name="renewal_months",
            field=models.PositiveIntegerField(
                default=1,
                verbose_name="عدد شهور التجديد",
            ),
        ),
    ]
