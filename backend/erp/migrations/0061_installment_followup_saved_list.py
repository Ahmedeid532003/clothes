import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0060_sale_delivery_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="InstallmentFollowUpSavedList",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("list_number", models.CharField(db_index=True, max_length=80, unique=True)),
                ("filter_snapshot", models.JSONField(blank=True, default=dict)),
                ("filter_summary", models.CharField(blank=True, max_length=500)),
                ("customer_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="installment_followup_saved_lists",
                        to="erp.user",
                    ),
                ),
            ],
            options={
                "verbose_name": "ليسته متابع أقساط",
                "verbose_name_plural": "ليستات متابع الأقساط",
                "ordering": ["-updated_at"],
            },
        ),
    ]
