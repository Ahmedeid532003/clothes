# Generated manually for supplier weekly inventory reports

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0045_supplier_category_department"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="weekly_inventory_day",
            field=models.CharField(
                blank=True,
                choices=[
                    ("saturday", "السبت"),
                    ("sunday", "الأحد"),
                    ("monday", "الإثنين"),
                    ("tuesday", "الثلاثاء"),
                    ("wednesday", "الأربعاء"),
                    ("thursday", "الخميس"),
                    ("friday", "الجمعة"),
                ],
                default="",
                help_text="يوم إرسال كشف الجرد الأسبوعي للمورد",
                max_length=12,
            ),
        ),
        migrations.CreateModel(
            name="SupplierWeeklyInventoryReport",
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
                ("report_date", models.DateField()),
                ("week_start", models.DateField()),
                ("week_end", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("generated", "تم الإنشاء"),
                            ("sent", "تم الإرسال"),
                            ("failed", "فشل الإرسال"),
                        ],
                        default="generated",
                        max_length=20,
                    ),
                ),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("whatsapp_sent_at", models.DateTimeField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "supplier",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="weekly_inventory_reports",
                        to="erp.supplier",
                    ),
                ),
            ],
            options={
                "verbose_name": "كشف جرد مورد أسبوعي",
                "verbose_name_plural": "كشوف جرد الموردين الأسبوعية",
                "ordering": ["-report_date", "-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="supplierweeklyinventoryreport",
            constraint=models.UniqueConstraint(
                fields=("supplier", "report_date"),
                name="uniq_supplier_weekly_report_date",
            ),
        ),
    ]
