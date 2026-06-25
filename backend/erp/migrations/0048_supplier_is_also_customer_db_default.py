from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0047_supplier_also_customer"),
    ]

    operations = [
        migrations.AlterField(
            model_name="supplier",
            name="is_also_customer",
            field=models.BooleanField(
                db_default=False,
                default=False,
                help_text="المورد يشتري منا أيضاً — يرتبط بحساب عميل",
            ),
        ),
    ]
