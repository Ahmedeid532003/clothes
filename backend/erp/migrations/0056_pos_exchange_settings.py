from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0055_customer_group_color"),
    ]

    operations = [
        migrations.AddField(
            model_name="inventorysettings",
            name="pos_commission_basis",
            field=models.CharField(
                choices=[("seller", "البائع"), ("product", "الصنف")],
                default="seller",
                help_text="أساس حساب عمولة البيع في نقطة البيع",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="inventorysettings",
            name="pos_force_return_from_invoice",
            field=models.BooleanField(
                default=True,
                help_text="إجبار المرتجع من فاتورة بيع أصلية في تبويب التبديل",
            ),
        ),
        migrations.AddField(
            model_name="inventorysettings",
            name="pos_require_seller_on_scan",
            field=models.BooleanField(
                default=True,
                help_text="طلب رقم البائع بعد مسح الباركود في نقطة البيع",
            ),
        ),
        migrations.AddField(
            model_name="saleline",
            name="line_commission",
            field=models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14),
        ),
        migrations.AddField(
            model_name="saleline",
            name="seller",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sale_lines_sold",
                to="erp.user",
            ),
        ),
    ]
