import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0046_supplier_weekly_inventory"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="is_also_customer",
            field=models.BooleanField(
                default=False,
                help_text="المورد يشتري منا أيضاً — يرتبط بحساب عميل",
            ),
        ),
        migrations.AddField(
            model_name="supplier",
            name="linked_customer",
            field=models.ForeignKey(
                blank=True,
                help_text="حساب العميل المرتبط عند تفعيل «مورد عميل أيضاً»",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="linked_supplier",
                to="erp.customer",
            ),
        ),
    ]
