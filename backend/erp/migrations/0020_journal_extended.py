# Generated manually for journal workflow extensions

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0019_chart_currency_depreciation"),
    ]

    operations = [
        migrations.AddField(
            model_name="journalentry",
            name="entry_kind",
            field=models.CharField(
                choices=[("manual", "يدوي"), ("system", "آلي")],
                default="manual",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="journalentry",
            name="branch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="journal_entries",
                to="erp.branch",
            ),
        ),
        migrations.AddField(
            model_name="journalentry",
            name="cost_center",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="journal_entries",
                to="erp.costcenter",
            ),
        ),
        migrations.AddField(
            model_name="journalentry",
            name="currency",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="journal_entries",
                to="erp.currency",
            ),
        ),
        migrations.AddField(
            model_name="journalentry",
            name="total_debit",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="journalentry",
            name="total_credit",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="journalentry",
            name="approved_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="journal_entries_approved",
                to="erp.user",
            ),
        ),
        migrations.AddField(
            model_name="journalentry",
            name="approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="journalentry",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "مسودة"),
                    ("approved", "معتمد"),
                    ("posted", "مرحّل"),
                    ("void", "ملغى"),
                ],
                default="draft",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="journalline",
            name="cost_center",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="journal_lines",
                to="erp.costcenter",
            ),
        ),
    ]
