# Supplier types/groups professional fields + payment vouchers

import uuid
from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0014_sync_branch_sale_warehouses"),
    ]

    operations = [
        migrations.AddField(
            model_name="suppliergroup",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="suppliergroup",
            name="is_system",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="suppliergroup",
            name="settlement_mode",
            field=models.CharField(
                choices=[
                    ("consignment", "أمانات"),
                    ("cash", "نقدي"),
                    ("credit_returns", "أجل ومرتجعات بمواعيد"),
                    ("credit_no_returns", "أجل بدون مرتجعات"),
                ],
                default="consignment",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="suppliertype",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="suppliertype",
            name="entity_kind",
            field=models.CharField(
                choices=[
                    ("establishment", "منشأة / مصنع"),
                    ("office", "مكتب"),
                    ("establishment_office", "منشأة ومكتب"),
                    ("shop", "محل"),
                    ("pos_point", "نقطة بيع"),
                ],
                default="establishment",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="suppliertype",
            name="is_system",
            field=models.BooleanField(
                default=False,
                help_text="نوع افتراضي من النظام — لا يُحذف",
            ),
        ),
        migrations.CreateModel(
            name="SupplierPayment",
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
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("payment_date", models.DateField()),
                (
                    "payment_method",
                    models.CharField(
                        choices=[
                            ("cash", "نقدي"),
                            ("bank", "تحويل بنكي"),
                            ("cheque", "شيك"),
                        ],
                        default="cash",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "مسودة"),
                            ("approved", "معتمد"),
                            ("cancelled", "ملغى"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                (
                    "account_entry",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payment",
                        to="erp.supplieraccountentry",
                    ),
                ),
                (
                    "approved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="supplier_payments_approved",
                        to="erp.user",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="supplier_payments_created",
                        to="erp.user",
                    ),
                ),
                (
                    "supplier",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payments",
                        to="erp.supplier",
                    ),
                ),
            ],
            options={
                "verbose_name": "إذن دفع مورد",
                "verbose_name_plural": "إذونات دفع الموردين",
                "ordering": ["-created_at"],
            },
        ),
        migrations.RunPython(
            lambda apps, schema_editor: __import__(
                "erp.services.suppliers", fromlist=["seed_supplier_defaults"]
            ).seed_supplier_defaults(),
            migrations.RunPython.noop,
        ),
    ]
