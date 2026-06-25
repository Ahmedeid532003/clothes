import uuid
from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0068_work_shift_enhanced"),
    ]

    operations = [
        migrations.CreateModel(
            name="PayrollStatement",
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
                ("code", models.CharField(max_length=30, unique=True)),
                ("period_year", models.PositiveSmallIntegerField()),
                ("period_month", models.PositiveSmallIntegerField()),
                (
                    "total_amount",
                    models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("draft", "مسودة"), ("approved", "معتمد")],
                        default="approved",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payroll_statements",
                        to="erp.branch",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payroll_statements_created",
                        to="erp.user",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="payrollstatement",
            constraint=models.UniqueConstraint(
                fields=("period_year", "period_month", "branch"),
                name="erp_payroll_statement_period_branch_uniq",
            ),
        ),
    ]
