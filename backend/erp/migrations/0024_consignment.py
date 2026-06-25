# Consignment (shop goods on deposit) module

import uuid
from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0023_receivables_installments"),
    ]

    operations = [
        migrations.CreateModel(
            name="ConsignmentMovement",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(db_index=True, max_length=30, unique=True)),
                (
                    "movement_type",
                    models.CharField(
                        choices=[
                            ("send", "إرسال أمانة"),
                            ("return", "مرتجع أمانة"),
                            ("transfer", "تحويل أمانة"),
                            ("count", "جرد أمانة"),
                            ("settlement", "تسوية عجز/زيادة"),
                        ],
                        max_length=20,
                    ),
                ),
                ("movement_date", models.DateField(db_index=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "مسودة"),
                            ("pending", "بانتظار الموافقة"),
                            ("approved", "معتمد"),
                            ("cancelled", "ملغى"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("total_qty", models.DecimalField(decimal_places=3, default=Decimal("0"), max_digits=14)),
                ("total_value", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                (
                    "approved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="consignment_movements_approved",
                        to="erp.user",
                    ),
                ),
                (
                    "branch",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="consignment_movements",
                        to="erp.branch",
                    ),
                ),
                (
                    "counterparty_customer",
                    models.ForeignKey(
                        blank=True,
                        help_text="محل الوجهة عند التحويل",
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="consignment_transfers_in",
                        to="erp.customer",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="consignment_movements_created",
                        to="erp.user",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="consignment_movements",
                        to="erp.customer",
                    ),
                ),
                (
                    "warehouse",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="consignment_movements",
                        to="erp.warehouse",
                    ),
                ),
            ],
            options={
                "verbose_name": "حركة أمانة",
                "verbose_name_plural": "حركات الأمانات",
                "ordering": ["-movement_date", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ConsignmentBalance",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("qty_sent_total", models.DecimalField(decimal_places=3, default=Decimal("0"), max_digits=14)),
                ("qty_returned_total", models.DecimalField(decimal_places=3, default=Decimal("0"), max_digits=14)),
                ("qty_on_hand", models.DecimalField(decimal_places=3, default=Decimal("0"), max_digits=14)),
                (
                    "qty_sold",
                    models.DecimalField(
                        decimal_places=3,
                        default=Decimal("0"),
                        help_text="مرسل - رصيد - مرتجع",
                        max_digits=14,
                    ),
                ),
                ("last_movement_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="consignment_balances",
                        to="erp.customer",
                    ),
                ),
                (
                    "variant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="consignment_balances",
                        to="erp.productvariant",
                    ),
                ),
                (
                    "warehouse",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="consignment_balances",
                        to="erp.warehouse",
                    ),
                ),
            ],
            options={
                "verbose_name": "رصيد أمانة",
                "verbose_name_plural": "أرصدة الأمانات",
                "unique_together": {("customer", "variant", "warehouse")},
            },
        ),
        migrations.CreateModel(
            name="ConsignmentMovementLine",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("quantity", models.DecimalField(decimal_places=3, max_digits=14)),
                ("unit_price", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=12)),
                ("batch_lot", models.CharField(blank=True, help_text="التشغيلة", max_length=80)),
                ("barcode_snapshot", models.CharField(blank=True, max_length=64)),
                (
                    "system_qty",
                    models.DecimalField(
                        blank=True,
                        decimal_places=3,
                        help_text="رصيد دفتر الجرد",
                        max_digits=14,
                        null=True,
                    ),
                ),
                (
                    "counted_qty",
                    models.DecimalField(
                        blank=True,
                        decimal_places=3,
                        help_text="رصيد فعلي الجرد",
                        max_digits=14,
                        null=True,
                    ),
                ),
                (
                    "variance_qty",
                    models.DecimalField(
                        decimal_places=3,
                        default=Decimal("0"),
                        help_text="فرق الجرد",
                        max_digits=14,
                    ),
                ),
                (
                    "movement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="erp.consignmentmovement",
                    ),
                ),
                (
                    "variant",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="erp.productvariant"),
                ),
            ],
            options={
                "verbose_name": "بند أمانة",
                "verbose_name_plural": "بنود الأمانات",
            },
        ),
        migrations.CreateModel(
            name="ConsignmentAuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("entity_type", models.CharField(db_index=True, max_length=40)),
                ("entity_id", models.UUIDField(db_index=True)),
                ("action", models.CharField(max_length=40)),
                ("summary", models.CharField(max_length=500)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="consignment_audits",
                        to="erp.user",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="ConsignmentActivityLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(max_length=40)),
                ("summary", models.CharField(max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "customer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="consignment_activities",
                        to="erp.customer",
                    ),
                ),
                (
                    "movement",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="activities",
                        to="erp.consignmentmovement",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="consignment_activities",
                        to="erp.user",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="consignmentmovement",
            index=models.Index(fields=["customer", "movement_type", "status"], name="erp_consign_cust_ty_st_idx"),
        ),
        migrations.AddIndex(
            model_name="consignmentmovement",
            index=models.Index(fields=["movement_date", "status"], name="erp_consign_date_st_idx"),
        ),
        migrations.AddIndex(
            model_name="consignmentbalance",
            index=models.Index(fields=["customer", "qty_on_hand"], name="erp_consign_cust_qty_idx"),
        ),
        migrations.AddIndex(
            model_name="consignmentbalance",
            index=models.Index(fields=["variant"], name="erp_consign_variant_idx"),
        ),
        migrations.AddIndex(
            model_name="consignmentmovementline",
            index=models.Index(fields=["movement", "variant"], name="erp_consign_mv_var_idx"),
        ),
    ]
