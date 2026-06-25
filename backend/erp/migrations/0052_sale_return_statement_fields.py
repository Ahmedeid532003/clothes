# Sale return — down payment refund & return interest for customer statement

from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0051_store_offer_notice"),
    ]

    operations = [
        migrations.AddField(
            model_name="salereturn",
            name="down_payment_refund",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0"),
                help_text="مبلغ مقدم مُردود للعميل — يظهر سالباً في كشف الحساب",
                max_digits=14,
            ),
        ),
        migrations.AddField(
            model_name="salereturn",
            name="return_interest",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0"),
                help_text="فوائد تقسيط مرتجعة مع المردود",
                max_digits=14,
            ),
        ),
    ]
