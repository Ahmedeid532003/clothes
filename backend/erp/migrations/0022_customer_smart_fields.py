# Smart customer fields + activity log + attachments

import uuid
from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0021_customers_module"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="national_id",
            field=models.CharField(blank=True, db_index=True, max_length=14),
        ),
        migrations.AddField(
            model_name="customer",
            name="governorate",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="customer",
            name="city",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="customer",
            name="district",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="customer",
            name="gps_lat",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="customer",
            name="gps_lng",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="customer",
            name="barcode",
            field=models.CharField(blank=True, max_length=40),
        ),
        migrations.AddField(
            model_name="customer",
            name="credit_score",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="customer",
            name="purchase_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="customer",
            name="avg_purchase_amount",
            field=models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14),
        ),
        migrations.AddField(
            model_name="customer",
            name="is_stopped",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="customer",
            name="stop_reason",
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="customer",
            name="uses_consignment",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="customer",
            name="route_line",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="customer",
            name="customer_rating",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="CustomerActivityLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(max_length=40)),
                ("summary", models.CharField(max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="activity_logs",
                        to="erp.customer",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="customer_activities",
                        to="erp.user",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="CustomerAttachment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("kind", models.CharField(blank=True, max_length=40)),
                ("file", models.FileField(upload_to="customers/%Y/%m/")),
                ("original_name", models.CharField(blank=True, max_length=255)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attachments",
                        to="erp.customer",
                    ),
                ),
            ],
        ),
    ]
