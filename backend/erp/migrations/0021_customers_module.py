# Customers module + optional Sale.customer

import uuid
from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0020_journal_extended"),
    ]

    operations = [
        migrations.CreateModel(
            name="CustomerType",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=30, unique=True)),
                (
                    "slug",
                    models.CharField(
                        choices=[
                            ("establishment", "منشأة"),
                            ("shop", "محل"),
                            ("individual", "فرد"),
                        ],
                        default="individual",
                        max_length=30,
                    ),
                ),
                ("name_ar", models.CharField(max_length=200)),
                ("name_en", models.CharField(blank=True, max_length=200)),
                ("description", models.TextField(blank=True)),
                ("is_system", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("mandatory_fields", models.JSONField(blank=True, default=list)),
                ("field_visibility", models.JSONField(blank=True, default=dict)),
                ("workflow_steps", models.JSONField(blank=True, default=list)),
                ("form_schema", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "نوع عميل",
                "verbose_name_plural": "أنواع العملاء",
                "ordering": ["code"],
            },
        ),
        migrations.CreateModel(
            name="CustomerGroup",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=40, unique=True)),
                ("name_ar", models.CharField(max_length=200)),
                ("name_en", models.CharField(blank=True, max_length=200)),
                ("level", models.PositiveSmallIntegerField(default=0)),
                ("tree_path", models.CharField(blank=True, db_index=True, max_length=500)),
                ("path_label", models.CharField(blank=True, max_length=500)),
                (
                    "default_discount_percent",
                    models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=5),
                ),
                (
                    "default_payment_policy",
                    models.CharField(
                        choices=[
                            ("cash", "نقدي"),
                            ("credit_7", "آجل 7 أيام"),
                            ("credit_15", "آجل 15 يوم"),
                            ("credit_30", "آجل 30 يوم"),
                            ("credit_60", "آجل 60 يوم"),
                            ("installment", "أقساط"),
                        ],
                        default="cash",
                        max_length=30,
                    ),
                ),
                (
                    "default_credit_limit",
                    models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14),
                ),
                ("region", models.CharField(blank=True, max_length=120)),
                (
                    "risk_level",
                    models.CharField(
                        choices=[
                            ("low", "منخفض"),
                            ("medium", "متوسط"),
                            ("high", "مرتفع"),
                            ("blocked", "محظور"),
                        ],
                        default="medium",
                        max_length=20,
                    ),
                ),
                (
                    "volume_tier",
                    models.CharField(
                        choices=[
                            ("small", "صغير"),
                            ("medium", "متوسط"),
                            ("large", "كبير"),
                            ("key", "استراتيجي"),
                        ],
                        default="medium",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("is_system", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="children",
                        to="erp.customergroup",
                    ),
                ),
                (
                    "salesperson",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="customer_groups_assigned",
                        to="erp.user",
                    ),
                ),
            ],
            options={
                "verbose_name": "مجموعة عملاء",
                "verbose_name_plural": "مجموعات العملاء",
                "ordering": ["tree_path", "code"],
            },
        ),
        migrations.CreateModel(
            name="Customer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=30, unique=True)),
                ("name_ar", models.CharField(max_length=200)),
                ("name_en", models.CharField(blank=True, max_length=200)),
                ("phone", models.CharField(blank=True, max_length=30)),
                ("whatsapp", models.CharField(blank=True, max_length=30)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("address", models.TextField(blank=True)),
                ("workflow_status", models.CharField(default="draft", max_length=40)),
                ("profile_data", models.JSONField(blank=True, default=dict)),
                ("credit_limit", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("discount_percent", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=5)),
                ("payment_policy", models.CharField(blank=True, max_length=30)),
                ("balance_due", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("total_sales", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("total_collected", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("last_activity_at", models.DateTimeField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "assigned_salesperson",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="customers_assigned",
                        to="erp.user",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="customers_created",
                        to="erp.user",
                    ),
                ),
                (
                    "customer_group",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="customers",
                        to="erp.customergroup",
                    ),
                ),
                (
                    "customer_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="customers",
                        to="erp.customertype",
                    ),
                ),
            ],
            options={
                "verbose_name": "عميل",
                "verbose_name_plural": "العملاء",
                "ordering": ["code"],
            },
        ),
        migrations.AddField(
            model_name="sale",
            name="customer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sales",
                to="erp.customer",
            ),
        ),
    ]
