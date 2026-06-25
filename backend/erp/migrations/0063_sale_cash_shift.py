from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0062_shift_settings_enhanced"),
    ]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="cash_shift",
            field=models.ForeignKey(
                blank=True,
                help_text="وردية الكاشير النشطة عند إتمام البيع",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sales",
                to="erp.cashshift",
            ),
        ),
        migrations.AddField(
            model_name="salereturn",
            name="cash_shift",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sale_returns",
                to="erp.cashshift",
            ),
        ),
    ]
