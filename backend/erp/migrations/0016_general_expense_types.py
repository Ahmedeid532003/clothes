# Generated manually for Ma7alyErp accounting module

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0015_supplier_professional"),
    ]

    operations = [
        migrations.CreateModel(
            name="GlAccount",
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
                ("name_ar", models.CharField(max_length=200)),
                ("name_en", models.CharField(blank=True, max_length=200)),
                (
                    "account_type",
                    models.CharField(
                        choices=[
                            ("expense", "مصروف"),
                            ("asset", "أصل"),
                            ("liability", "التزام"),
                            ("equity", "حقوق ملكية"),
                            ("revenue", "إيراد"),
                        ],
                        default="expense",
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="children",
                        to="erp.glaccount",
                    ),
                ),
            ],
            options={
                "verbose_name": "حساب",
                "verbose_name_plural": "شجرة الحسابات",
                "ordering": ["code"],
            },
        ),
        migrations.CreateModel(
            name="CostCenter",
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
                ("name_ar", models.CharField(max_length=200)),
                ("name_en", models.CharField(blank=True, max_length=200)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "branch",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="cost_centers",
                        to="erp.branch",
                    ),
                ),
            ],
            options={
                "verbose_name": "مركز تكلفة",
                "verbose_name_plural": "مراكز التكلفة",
                "ordering": ["code"],
            },
        ),
        migrations.CreateModel(
            name="GeneralExpenseType",
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
                ("code", models.CharField(max_length=40, unique=True)),
                ("name_ar", models.CharField(max_length=200)),
                ("name_en", models.CharField(blank=True, max_length=200)),
                (
                    "code_segment",
                    models.CharField(
                        blank=True,
                        help_text="جزء الكود الوسطي (مثل MNT, NET) — اختياري للتوليد التلقائي",
                        max_length=12,
                    ),
                ),
                ("level", models.PositiveSmallIntegerField(default=0)),
                ("tree_path", models.CharField(blank=True, db_index=True, max_length=500)),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "branch",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="expense_types",
                        to="erp.branch",
                    ),
                ),
                (
                    "cost_center",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="expense_types",
                        to="erp.costcenter",
                    ),
                ),
                (
                    "department",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="expense_types",
                        to="erp.department",
                    ),
                ),
                (
                    "gl_account",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="expense_types",
                        to="erp.glaccount",
                    ),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="children",
                        to="erp.generalexpensetype",
                    ),
                ),
            ],
            options={
                "verbose_name": "نوع مصروف عام",
                "verbose_name_plural": "أنواع المصروفات العامة",
                "ordering": ["tree_path", "code"],
            },
        ),
        migrations.AddConstraint(
            model_name="generalexpensetype",
            constraint=models.UniqueConstraint(
                condition=models.Q(("is_active", True)),
                fields=("parent", "name_ar"),
                name="uniq_active_expense_type_name_per_parent",
            ),
        ),
    ]
