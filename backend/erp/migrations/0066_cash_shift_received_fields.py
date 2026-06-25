from django.db import migrations, models
import django.db.models.deletion


def backfill_received_from_approved(apps, schema_editor):
    CashShift = apps.get_model("erp", "CashShift")
    for s in CashShift.objects.filter(handover_status="completed", received_by_id__isnull=True):
        if s.approved_by_id:
            s.received_by_id = s.approved_by_id
            s.received_at = s.approved_at
            s.save(update_fields=["received_by_id", "received_at"])


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0065_cash_shift_report_snapshot_default"),
    ]

    operations = [
        migrations.AddField(
            model_name="cashshift",
            name="received_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="cashshift",
            name="received_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cash_shifts_received",
                to="erp.user",
            ),
        ),
        migrations.AddField(
            model_name="cashshift",
            name="received_treasury",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cash_shifts_received_into",
                to="erp.treasury",
            ),
        ),
        migrations.RunPython(backfill_received_from_approved, migrations.RunPython.noop),
    ]
