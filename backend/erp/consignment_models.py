"""أمانات المحلات — حركات، أرصدة، تدقيق."""

import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone


class ConsignmentMovement(models.Model):
    """إذن حركة أمانة: إرسال / مرتجع / تحويل / جرد / تسوية."""

    class MovementType(models.TextChoices):
        SEND = "send", "إرسال أمانة"
        RETURN = "return", "مرتجع أمانة"
        TRANSFER = "transfer", "تحويل أمانة"
        COUNT = "count", "جرد أمانة"
        SETTLEMENT = "settlement", "تسوية عجز/زيادة"

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        PENDING = "pending", "بانتظار الموافقة"
        APPROVED = "approved", "معتمد"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True, db_index=True)
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    movement_date = models.DateField(db_index=True)
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.PROTECT,
        related_name="consignment_movements",
    )
    counterparty_customer = models.ForeignKey(
        "Customer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="consignment_transfers_in",
        help_text="محل الوجهة عند التحويل",
    )
    warehouse = models.ForeignKey(
        "Warehouse",
        on_delete=models.PROTECT,
        related_name="consignment_movements",
    )
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consignment_movements",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    total_qty = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))
    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="consignment_movements_created",
    )
    approved_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consignment_movements_approved",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-movement_date", "-created_at"]
        verbose_name = "حركة أمانة"
        verbose_name_plural = "حركات الأمانات"
        indexes = [
            models.Index(fields=["customer", "movement_type", "status"]),
            models.Index(fields=["movement_date", "status"]),
        ]

    def __str__(self):
        return self.code


class ConsignmentMovementLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    movement = models.ForeignKey(
        ConsignmentMovement, on_delete=models.CASCADE, related_name="lines"
    )
    variant = models.ForeignKey("ProductVariant", on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    batch_lot = models.CharField(max_length=80, blank=True, help_text="التشغيلة")
    barcode_snapshot = models.CharField(max_length=64, blank=True)
    system_qty = models.DecimalField(
        max_digits=14, decimal_places=3, null=True, blank=True, help_text="رصيد دفتر الجرد"
    )
    counted_qty = models.DecimalField(
        max_digits=14, decimal_places=3, null=True, blank=True, help_text="رصيد فعلي الجرد"
    )
    variance_qty = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal("0"), help_text="فرق الجرد"
    )

    class Meta:
        verbose_name = "بند أمانة"
        verbose_name_plural = "بنود الأمانات"
        indexes = [models.Index(fields=["movement", "variant"])]


class ConsignmentBalance(models.Model):
    """رصيد أمانة لدى عميل (محل) — يُحدَّث لحظياً عند اعتماد الحركات."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        "Customer", on_delete=models.CASCADE, related_name="consignment_balances"
    )
    variant = models.ForeignKey(
        "ProductVariant", on_delete=models.CASCADE, related_name="consignment_balances"
    )
    warehouse = models.ForeignKey(
        "Warehouse", on_delete=models.PROTECT, related_name="consignment_balances"
    )
    qty_sent_total = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))
    qty_returned_total = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal("0")
    )
    qty_on_hand = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))
    qty_sold = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        default=Decimal("0"),
        help_text="مرسل - رصيد - مرتجع",
    )
    last_movement_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("customer", "variant", "warehouse")]
        verbose_name = "رصيد أمانة"
        verbose_name_plural = "أرصدة الأمانات"
        indexes = [
            models.Index(fields=["customer", "qty_on_hand"]),
            models.Index(fields=["variant"]),
        ]

    def recalc_sold(self):
        self.qty_sold = (
            self.qty_sent_total - self.qty_on_hand - self.qty_returned_total
        ).quantize(Decimal("0.001"))


class ConsignmentAuditLog(models.Model):
    """سجل تدقيق — لا يُحذف."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity_type = models.CharField(max_length=40, db_index=True)
    entity_id = models.UUIDField(db_index=True)
    action = models.CharField(max_length=40)
    summary = models.CharField(max_length=500)
    user = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, related_name="consignment_audits"
    )
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class ConsignmentActivityLog(models.Model):
    """سجل نشاط تشغيلي."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="consignment_activities",
    )
    movement = models.ForeignKey(
        ConsignmentMovement,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="activities",
    )
    action = models.CharField(max_length=40)
    summary = models.CharField(max_length=500)
    user = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, related_name="consignment_activities"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
