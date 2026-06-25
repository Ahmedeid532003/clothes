# Generated manually for shift/treasury workflow

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0061_installment_followup_saved_list"),
    ]

    operations = [
        migrations.AddField(
            model_name="accountingsettings",
            name="auto_close_enabled",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="accountingsettings",
            name="auto_close_hour",
            field=models.PositiveSmallIntegerField(default=23),
        ),
        migrations.AddField(
            model_name="accountingsettings",
            name="require_open_shift_for_pos",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="accountingsettings",
            name="chief_treasury",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="chief_for_shifts",
                to="erp.treasury",
            ),
        ),
    ]
