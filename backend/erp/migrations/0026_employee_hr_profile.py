# HR: job titles, employee groups, profiles, allowances, salary increases

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0025_hr_sections_work_shifts"),
    ]

    operations = [
        migrations.CreateModel(
            name="JobTitle",
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
                ("code", models.CharField(max_length=20, unique=True)),
                ("name", models.CharField(max_length=200)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["code"]},
        ),
        migrations.CreateModel(
            name="EmployeeGroup",
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
                ("code", models.CharField(max_length=20, unique=True)),
                ("name", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["code"]},
        ),
        migrations.CreateModel(
            name="EmployeeProfile",
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
                ("hire_date", models.DateField(blank=True, null=True)),
                (
                    "hire_salary",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="مرتب التعيين الأصلي",
                        max_digits=14,
                    ),
                ),
                (
                    "basic_salary",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="الراتب الأساسي الحالي (قبل الزيادات المسجلة)",
                        max_digits=14,
                    ),
                ),
                (
                    "commission_mode",
                    models.CharField(
                        choices=[
                            ("none", "بدون عمولة"),
                            ("percent", "نسبة مئوية"),
                            ("per_thousand", "مبلغ لكل 1000 مبيعات"),
                        ],
                        default="none",
                        max_length=20,
                    ),
                ),
                (
                    "commission_percent",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="نسبة العمولة %",
                        max_digits=6,
                    ),
                ),
                (
                    "commission_per_1000",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="مبلغ العمولة لكل 1000 جنيه مبيعات",
                        max_digits=12,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now_add=True)),
                (
                    "employee_group",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="employees",
                        to="erp.employeegroup",
                    ),
                ),
                (
                    "job_title",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="employees",
                        to="erp.jobtitle",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="employee_profile",
                        to="erp.user",
                    ),
                ),
            ],
            options={"ordering": ["user__employee_code"]},
        ),
        migrations.CreateModel(
            name="EmployeeSalaryIncrease",
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
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("effective_date", models.DateField()),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="salary_increases",
                        to="erp.user",
                    ),
                ),
            ],
            options={"ordering": ["-effective_date"]},
        ),
        migrations.CreateModel(
            name="EmployeeAllowance",
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
                ("name", models.CharField(max_length=120)),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pay_allowances",
                        to="erp.user",
                    ),
                ),
            ],
            options={"ordering": ["name"]},
        ),
    ]
