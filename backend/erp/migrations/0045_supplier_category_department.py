# Supplier classification group + merchandise department

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0044_supplier_contact_person"),
    ]

    operations = [
        migrations.CreateModel(
            name="SupplierCategory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=30, unique=True)),
                ("name_ar", models.CharField(max_length=200)),
                ("name_en", models.CharField(blank=True, max_length=200)),
                (
                    "category_kind",
                    models.CharField(
                        choices=[
                            ("local", "موردين محليين"),
                            ("imported", "موردين مستوردين"),
                            ("wholesale", "موردين جملة"),
                            ("retail", "موردين قطاعى"),
                            ("strategic", "موردين استراتيجيين"),
                            ("seasonal", "موردين موسميين"),
                            ("other", "أخرى"),
                        ],
                        default="other",
                        max_length=30,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                ("is_system", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "مجموعة تصنيف مورد",
                "verbose_name_plural": "مجموعات تصنيف الموردين",
                "ordering": ["code"],
            },
        ),
        migrations.CreateModel(
            name="SupplierDepartment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=30, unique=True)),
                ("name_ar", models.CharField(max_length=200)),
                ("name_en", models.CharField(blank=True, max_length=200)),
                (
                    "dept_kind",
                    models.CharField(
                        choices=[
                            ("women", "حريمى"),
                            ("men", "رجالى"),
                            ("children", "أطفالى"),
                            ("shoes", "أحذية"),
                            ("bags", "شنط"),
                            ("accessories", "إكسسوارات"),
                            ("watches", "ساعات"),
                            ("cosmetics", "مستحضرات تجميل"),
                            ("sportswear", "ملابس رياضية"),
                            ("other", "أخرى"),
                        ],
                        default="other",
                        max_length=30,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                ("is_system", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "قسم مورد",
                "verbose_name_plural": "أقسام الموردين",
                "ordering": ["code"],
            },
        ),
        migrations.AddField(
            model_name="supplier",
            name="supplier_category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="suppliers",
                to="erp.suppliercategory",
            ),
        ),
        migrations.AddField(
            model_name="supplier",
            name="supplier_department",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="suppliers",
                to="erp.supplierdepartment",
            ),
        ),
    ]
