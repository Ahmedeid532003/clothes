# Generated manually for composite bundle sales at POS.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0027_hr_payroll"),
    ]

    operations = [
        migrations.AddField(
            model_name="saleline",
            name="composite_product",
            field=models.ForeignKey(
                blank=True,
                help_text="عرض مركب — يُخصم من مكوّناته عند البيع",
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="sale_lines",
                to="erp.compositeproduct",
            ),
        ),
        migrations.AlterField(
            model_name="saleline",
            name="variant",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="sale_lines",
                to="erp.productvariant",
            ),
        ),
        migrations.AddConstraint(
            model_name="saleline",
            constraint=models.CheckConstraint(
                check=(
                    models.Q(variant__isnull=False, composite_product__isnull=True)
                    | models.Q(variant__isnull=True, composite_product__isnull=False)
                ),
                name="saleline_variant_xor_composite",
            ),
        ),
    ]
