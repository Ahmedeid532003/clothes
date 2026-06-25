# Customer receivables, installments, follow-ups, reminders

import uuid
from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0022_customer_smart_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="InstallmentPlanTemplate",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=30, unique=True)),
                ("name_ar", models.CharField(max_length=200)),
                ("name_en", models.CharField(blank=True, max_length=200)),
                (
                    "frequency",
                    models.CharField(
                        choices=[
                            ("weekly", "أسبوعي"),
                            ("biweekly", "كل أسبوعين"),
                            ("monthly", "شهري"),
                        ],
                        default="monthly",
                        max_length=20,
                    ),
                ),
                ("default_num_installments", models.PositiveSmallIntegerField(default=6)),
                (
                    "interest_rate_percent",
                    models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=6),
                ),
                (
                    "penalty_rate_percent",
                    models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=6),
                ),
                ("grace_days", models.PositiveSmallIntegerField(default=0)),
                (
                    "early_settlement_discount_percent",
                    models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=5),
                ),
                ("penalty_rules", models.JSONField(blank=True, default=dict)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["code"]},
        ),
        migrations.CreateModel(
            name="ReceivableInvoice",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=30, unique=True)),
                ("issue_date", models.DateField()),
                ("due_date", models.DateField(db_index=True)),
                ("amount_total", models.DecimalField(decimal_places=2, max_digits=14)),
                ("amount_paid", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "مفتوحة"),
                            ("partial", "جزئية"),
                            ("paid", "مسددة"),
                            ("overdue", "متأخرة"),
                            ("written_off", "مشطوبة"),
                        ],
                        default="open",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("block_new_sales", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "branch",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="receivable_invoices",
                        to="erp.branch",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="receivable_invoices",
                        to="erp.customer",
                    ),
                ),
                (
                    "sale",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="receivable_invoices",
                        to="erp.sale",
                    ),
                ),
                (
                    "salesperson",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="receivable_invoices_assigned",
                        to="erp.user",
                    ),
                ),
            ],
            options={
                "verbose_name": "ذمة عميل",
                "verbose_name_plural": "ذمم العملاء",
                "ordering": ["-due_date", "code"],
            },
        ),
        migrations.CreateModel(
            name="ReceivablePayment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=30, unique=True)),
                ("payment_date", models.DateField()),
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                (
                    "method",
                    models.CharField(
                        choices=[
                            ("cash", "نقدي"),
                            ("bank", "تحويل"),
                            ("cheque", "شيك"),
                            ("card", "بطاقة"),
                        ],
                        default="cash",
                        max_length=20,
                    ),
                ),
                ("reference", models.CharField(blank=True, max_length=120)),
                ("allocations", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="receivable_payments_created",
                        to="erp.user",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="receivable_payments",
                        to="erp.customer",
                    ),
                ),
            ],
            options={"ordering": ["-payment_date", "code"]},
        ),
        migrations.CreateModel(
            name="InstallmentContract",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=30, unique=True)),
                ("principal_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("num_installments", models.PositiveSmallIntegerField()),
                ("installment_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                (
                    "interest_rate_percent",
                    models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=6),
                ),
                (
                    "penalty_rate_percent",
                    models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=6),
                ),
                ("grace_days", models.PositiveSmallIntegerField(default=0)),
                ("early_settlement_allowed", models.BooleanField(default=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "مسودة"),
                            ("pending_approval", "بانتظار الموافقة"),
                            ("active", "نشط"),
                            ("completed", "مكتمل"),
                            ("cancelled", "ملغى"),
                        ],
                        default="draft",
                        max_length=30,
                    ),
                ),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "approved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="installment_contracts_approved",
                        to="erp.user",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="installment_contracts_created",
                        to="erp.user",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="installment_contracts",
                        to="erp.customer",
                    ),
                ),
                (
                    "plan",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="contracts",
                        to="erp.installmentplantemplate",
                    ),
                ),
                (
                    "receivable",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="installment_contracts",
                        to="erp.receivableinvoice",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="InstallmentLine",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("sequence", models.PositiveSmallIntegerField()),
                ("due_date", models.DateField(db_index=True)),
                ("amount_due", models.DecimalField(decimal_places=2, max_digits=14)),
                ("amount_paid", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("penalty_amount", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("scheduled", "مجدول"),
                            ("due", "مستحق"),
                            ("paid", "مسدد"),
                            ("late", "متأخر"),
                            ("deferred", "مؤجل"),
                            ("cancelled", "ملغى"),
                        ],
                        default="scheduled",
                        max_length=20,
                    ),
                ),
                ("deferred_to", models.DateField(blank=True, null=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("notes", models.CharField(blank=True, max_length=300)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "contract",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="erp.installmentcontract",
                    ),
                ),
                (
                    "parent_line",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="split_children",
                        to="erp.installmentline",
                    ),
                ),
            ],
            options={
                "ordering": ["contract", "sequence"],
                "unique_together": {("contract", "sequence")},
            },
        ),
        migrations.CreateModel(
            name="CustomerFollowUp",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("scheduled_at", models.DateTimeField(db_index=True)),
                (
                    "channel",
                    models.CharField(
                        choices=[
                            ("call", "اتصال"),
                            ("whatsapp", "واتساب"),
                            ("sms", "SMS"),
                            ("email", "بريد"),
                            ("visit", "زيارة"),
                        ],
                        default="call",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "قيد الانتظار"),
                            ("done", "تمت"),
                            ("cancelled", "ملغاة"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "assigned_to",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="customer_follow_ups",
                        to="erp.user",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="follow_ups",
                        to="erp.customer",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="CustomerReminder",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "channel",
                    models.CharField(
                        choices=[
                            ("whatsapp", "واتساب"),
                            ("sms", "SMS"),
                            ("email", "بريد"),
                            ("in_app", "داخل النظام"),
                        ],
                        max_length=20,
                    ),
                ),
                ("subject", models.CharField(blank=True, max_length=200)),
                ("message", models.TextField()),
                ("scheduled_at", models.DateTimeField(db_index=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("queued", "في الانتظار"),
                            ("sent", "مُرسل"),
                            ("failed", "فشل"),
                            ("cancelled", "ملغى"),
                        ],
                        default="queued",
                        max_length=20,
                    ),
                ),
                (
                    "trigger",
                    models.CharField(
                        choices=[
                            ("auto_overdue", "تأخير تلقائي"),
                            ("scheduler", "مجدول"),
                            ("manual", "يدوي"),
                        ],
                        default="manual",
                        max_length=30,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reminders",
                        to="erp.customer",
                    ),
                ),
            ],
        ),
    ]
