# Generated manually for purchase invoice enhancements

from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0029_stock_disbursement_addition"),
    ]

    operations = [
        migrations.AddField(
            model_name="purchaseinvoice",
            name="payment_method",
            field=models.CharField(
                choices=[("cash", "نقدي"), ("credit", "أجل")],
                default="credit",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="purchaseinvoice",
            name="tax_amount",
            field=models.DecimalField(
                decimal_places=2, default=Decimal("0"), max_digits=14
            ),
        ),
        migrations.AddField(
            model_name="purchaseinvoice",
            name="journal_entry",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="purchase_invoices",
                to="erp.journalentry",
            ),
        ),
        migrations.AddField(
            model_name="purchaseinvoiceline",
            name="tax_percent",
            field=models.DecimalField(
                decimal_places=2, default=Decimal("0"), max_digits=6
            ),
        ),
        migrations.AddField(
            model_name="supplieraccountentry",
            name="purchase_invoice",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="supplier_entries",
                to="erp.purchaseinvoice",
            ),
        ),
    ]
