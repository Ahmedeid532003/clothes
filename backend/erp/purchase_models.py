"""فواتير الشراء ومرتجع الشراء — استلام مخزن."""

import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone


class PurchaseInvoice(models.Model):
    class InvoiceType(models.TextChoices):
        PURCHASE = "purchase", "فاتورة شراء"
        RETURN = "return", "مرتجع شراء"

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        RECEIVED = "received", "مستلمة"
        CANCELLED = "cancelled", "ملغاة"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "نقدي"
        CREDIT = "credit", "أجل"

    class ReturnReason(models.TextChoices):
        DEFECT = "defect", "عيب / تالف"
        WRONG_SIZE = "wrong_size", "مقاس غلط"
        WRONG_COLOR = "wrong_color", "لون غلط"
        EXCESS_QTY = "excess_qty", "زيادة كمية"
        BAD_QUALITY = "bad_quality", "خامة سيئة"
        OTHER = "other", "سبب آخر"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    invoice_type = models.CharField(
        max_length=20,
        choices=InvoiceType.choices,
        default=InvoiceType.PURCHASE,
    )
    supplier = models.ForeignKey(
        "Supplier",
        on_delete=models.PROTECT,
        related_name="purchase_invoices",
    )
    season = models.ForeignKey(
        "Season",
        on_delete=models.PROTECT,
        related_name="purchase_invoices",
    )
    brand = models.ForeignKey(
        "Brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_invoices",
    )
    warehouse = models.ForeignKey(
        "Warehouse",
        on_delete=models.PROTECT,
        related_name="purchase_invoices",
    )
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_invoices",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    invoice_date = models.DateField(default=timezone.localdate)
    notes = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    discount_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    tax_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CREDIT,
    )
    journal_entry = models.ForeignKey(
        "JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_invoices",
    )
    return_reason = models.CharField(
        max_length=30,
        choices=ReturnReason.choices,
        blank=True,
        default="",
    )
    source_invoice = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="returns",
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="purchase_invoices_created",
    )
    received_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_invoices_received",
    )
    received_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-invoice_date", "-created_at"]
        verbose_name = "فاتورة شراء"
        verbose_name_plural = "فواتير الشراء"

    def __str__(self):
        return f"{self.code} — {self.supplier_id}"


class PurchaseInvoiceLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        PurchaseInvoice,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    variant = models.ForeignKey(
        "ProductVariant",
        on_delete=models.PROTECT,
        related_name="purchase_lines",
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    discount_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0")
    )
    tax_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0")
    )
    line_total = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        verbose_name = "بند فاتورة شراء"
        verbose_name_plural = "بنود فواتير الشراء"

    def __str__(self):
        return f"{self.invoice.code} / {self.variant_id}"
