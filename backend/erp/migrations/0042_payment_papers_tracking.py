# Payment papers — types, extended statuses, disbursement details

import django.db.models.deletion
from django.db import migrations, models


def migrate_rejected_to_returned(apps, schema_editor):
    Cheque = apps.get_model("erp", "Cheque")
    Cheque.objects.filter(status="rejected").update(status="returned")


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0041_payroll_advances_scheduled"),
    ]

    operations = [
        migrations.AddField(
            model_name="cheque",
            name="paper_type",
            field=models.CharField(
                choices=[
                    ("cheque", "شيك"),
                    ("promissory_note", "كمبيالة"),
                    ("bill_of_exchange", "كمبيالة تجارية"),
                    ("other_paper", "ورقة دفع أخرى"),
                ],
                default="cheque",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="cheque",
            name="pay_source",
            field=models.CharField(
                blank=True,
                choices=[("cash", "نقداً من المنشأة"), ("bank", "من حساب بنكي")],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="cheque",
            name="pay_bank_account",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cheques_paid_from",
                to="erp.bankaccount",
            ),
        ),
        migrations.AddField(
            model_name="cheque",
            name="pay_amount",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True),
        ),
        migrations.AddField(
            model_name="cheque",
            name="pay_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="cheque",
            name="pay_notes",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="cheque",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "قيد الانتظار"),
                    ("delivered", "تم التسليم"),
                    ("paid", "تم الصرف"),
                    ("cancelled", "ملغاة"),
                    ("returned", "مرتجعة"),
                    ("rejected", "مرفوض"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_rejected_to_returned, migrations.RunPython.noop),
    ]
