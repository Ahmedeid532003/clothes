"""أوردرات — مسح باركود مسبق لتحميل المستندات."""

import uuid
from decimal import Decimal

from django.db import models


class ScanOrder(models.Model):
    """أوردر عام — بيع / تحويل / جرد / مرتجع مورد."""

    class OrderType(models.TextChoices):
        SALE = "sale", "بيع"
        TRANSFER = "transfer", "تحويل"
        STOCK_COUNT = "stock_count", "جرد"
        PURCHASE_RETURN = "purchase_return", "مرتجع مورد"

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        SAVED = "saved", "محفوظ"
        LOADED = "loaded", "تم التحميل"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    order_type = models.CharField(max_length=30, choices=OrderType.choices, default=OrderType.SALE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    employee = models.ForeignKey(
        "User",
        on_delete=models.PROTECT,
        related_name="scan_orders_as_employee",
        help_text="البائع / الموظف منشئ الأوردر",
    )
    branch = models.ForeignKey("Branch", on_delete=models.PROTECT, related_name="scan_orders")
    warehouse = models.ForeignKey(
        "Warehouse",
        on_delete=models.PROTECT,
        related_name="scan_orders",
        null=True,
        blank=True,
    )
    supplier = models.ForeignKey(
        "Supplier",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scan_orders",
        help_text="مطلوب لأوردر مرتجع مورد",
    )
    line_count = models.PositiveIntegerField(default=0)
    total_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))
    total_sale_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    notes = models.TextField(blank=True)
    printed_at = models.DateTimeField(null=True, blank=True)
    loaded_into = models.CharField(max_length=80, blank=True, help_text="نوع المستند الذي حُمّل إليه")
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="scan_orders_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "أوردر"
        verbose_name_plural = "أوردرات"


class ScanOrderLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scan_order = models.ForeignKey(ScanOrder, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(
        "ProductVariant",
        on_delete=models.PROTECT,
        related_name="scan_order_lines",
    )
    barcode_scanned = models.CharField(max_length=80, blank=True)
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("1"))
    unit_sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["scanned_at"]
        verbose_name = "بند أوردر"
        verbose_name_plural = "بنود الأوردرات"
