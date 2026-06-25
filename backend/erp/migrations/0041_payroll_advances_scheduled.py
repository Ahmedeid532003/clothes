# Payroll advances — scheduled installments, period locks, audit stamps

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0040_department_details"),
    ]

    operations = [
        migrations.AddField(
            model_name="employeeadvance",
            name="is_scheduled",
            field=models.BooleanField(default=False, help_text="سلفة مجدولة بأقساط شهرية"),
        ),
        migrations.AddField(
            model_name="employeeadvance",
            name="installment_months",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="employeeadvance",
            name="monthly_installment",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name="employeeadvance",
            name="branch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="employee_advances",
                to="erp.branch",
            ),
        ),
        migrations.AddField(
            model_name="employeeadvance",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="advances_created",
                to="erp.user",
            ),
        ),
        migrations.AddField(
            model_name="payrollpayment",
            name="grant_reason",
            field=models.CharField(blank=True, help_text="سبب المنحة / المكافأة", max_length=255),
        ),
        migrations.AddField(
            model_name="payrollpayment",
            name="branch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payroll_payments",
                to="erp.branch",
            ),
        ),
        migrations.AddField(
            model_name="payrollpayment",
            name="updated_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payroll_payments_updated",
                to="erp.user",
            ),
        ),
        migrations.AddField(
            model_name="payrollpayment",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.CreateModel(
            name="EmployeeAdvanceInstallment",
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
                ("period_year", models.PositiveSmallIntegerField()),
                ("period_month", models.PositiveSmallIntegerField()),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "معلق"), ("deducted", "مخصوم")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "advance",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="installments",
                        to="erp.employeeadvance",
                    ),
                ),
            ],
            options={
                "ordering": ["period_year", "period_month"],
            },
        ),
        migrations.CreateModel(
            name="PayrollPeriodLock",
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
                ("period_year", models.PositiveSmallIntegerField()),
                ("period_month", models.PositiveSmallIntegerField()),
                ("closed_at", models.DateTimeField(auto_now_add=True)),
                (
                    "closed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payroll_periods_closed",
                        to="erp.user",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="employeeadvanceinstallment",
            constraint=models.UniqueConstraint(
                fields=("advance", "period_year", "period_month"),
                name="erp_advance_installment_period_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="payrollperiodlock",
            constraint=models.UniqueConstraint(
                fields=("period_year", "period_month"),
                name="erp_payroll_period_lock_uniq",
            ),
        ),
    ]
