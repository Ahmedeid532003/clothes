from django.db import migrations, models


def backfill_report_snapshot(apps, schema_editor):
    CashShift = apps.get_model("erp", "CashShift")
    CashShift.objects.filter(report_snapshot__isnull=True).update(report_snapshot={})


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0064_cash_shift_report_snapshot"),
    ]

    operations = [
        migrations.RunPython(backfill_report_snapshot, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="cashshift",
            name="report_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
