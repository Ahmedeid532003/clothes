# Link supplier payments to payment paper tracking (cheques / promissory notes)

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0042_payment_papers_tracking"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplierpayment",
            name="paper_cheque_number",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="supplierpayment",
            name="paper_due_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="supplierpayment",
            name="paper_bank_account",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="supplier_payment_papers",
                to="erp.bankaccount",
            ),
        ),
        migrations.AddField(
            model_name="cheque",
            name="supplier_payment",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payment_paper",
                to="erp.supplierpayment",
            ),
        ),
    ]
