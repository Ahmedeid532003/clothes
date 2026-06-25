"""أوامر شراء (PO) — منفصلة عن فواتير الشراء؛ تتبع الإرسال والاستلام."""

import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone


class PurchaseOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        SENT = "sent", "مُرسل للمورد"
        PARTIAL = "partial", "استلام جزئي"
        RECEIVED = "received", "مستلم بالكامل"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    supplier = models.ForeignKey(
        "Supplier",
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    season = models.ForeignKey(
        "Season",
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    notes = models.TextField(blank=True)
    whatsapp_sent_at = models.DateTimeField(null=True, blank=True)
    sent_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_orders_sent",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "أمر شراء"
        verbose_name_plural = "أوامر الشراء"

    def __str__(self):
        return f"{self.code} — {self.supplier_id}"


class PurchaseOrderLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    product = models.ForeignKey(
        "Product",
        on_delete=models.PROTECT,
        related_name="purchase_order_lines",
    )
    quantity_ordered = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))
    quantity_received = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    notes = models.CharField(max_length=300, blank=True)

    class Meta:
        verbose_name = "بند أمر شراء"
        verbose_name_plural = "بنود أوامر الشراء"

    def __str__(self):
        return f"{self.order_id} / {self.product_id}"
