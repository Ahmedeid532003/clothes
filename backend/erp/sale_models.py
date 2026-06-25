"""مبيعات نقطة البيع — مربوطة بالفرع فقط (الفرع = نقطة البيع)."""

import uuid
from decimal import Decimal

from django.db import models


class Sale(models.Model):
    """
    فاتورة بيع من فرع (POS).
    لا يوجد جدول «نقطة بيع» منفصل — branch_id هو هوية منفذ البيع.
    """

    class Status(models.TextChoices):
        COMPLETED = "completed", "مكتملة"
        CANCELLED = "cancelled", "ملغاة"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "نقدي"
        CARD = "card", "بطاقة"
        WALLET = "wallet", "محفظة"
        CREDIT = "credit", "آجل"
        INSTALLMENT = "installment", "تقسيط"
        RESERVED = "reserved", "حجز"
        MIXED = "mixed", "مختلط"

    class DeliveryStatus(models.TextChoices):
        PENDING = "pending", "قيد التوصيل"
        DELIVERED = "delivered", "تم التوصيل"
        CANCELLED = "cancelled", "ملغاة"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.PROTECT,
        related_name="sales",
        help_text="نقطة البيع = الفرع",
    )
    warehouse = models.ForeignKey(
        "Warehouse",
        on_delete=models.PROTECT,
        related_name="sales",
        help_text="المخزن المخصوم منه (مخزن الفرع)",
    )
    season = models.ForeignKey(
        "Season",
        on_delete=models.PROTECT,
        related_name="sales",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    discount_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    tax_percent = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    commission_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    cashier_points = models.PositiveIntegerField(default=0)
    is_tax_invoice = models.BooleanField(default=False)
    tax_registration_number = models.CharField(max_length=64, blank=True)
    qr_payload = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    is_delivery = models.BooleanField(default=False)
    delivery_fee = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    delivery_agent = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delivery_sales",
    )
    delivery_status = models.CharField(
        max_length=20,
        choices=DeliveryStatus.choices,
        blank=True,
        default="",
    )
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="sales_created",
    )
    cash_shift = models.ForeignKey(
        "CashShift",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
        help_text="وردية الكاشير النشطة عند إتمام البيع",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "فاتورة بيع"
        verbose_name_plural = "فواتير البيع"

    def __str__(self):
        return f"{self.code} @ {self.branch_id}"


class SaleLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(
        "ProductVariant",
        on_delete=models.PROTECT,
        related_name="sale_lines",
        null=True,
        blank=True,
    )
    composite_product = models.ForeignKey(
        "CompositeProduct",
        on_delete=models.PROTECT,
        related_name="sale_lines",
        null=True,
        blank=True,
        help_text="عرض مركب — يُخصم من مكوّناته عند البيع",
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0")
    )
    line_total = models.DecimalField(max_digits=14, decimal_places=2)
    seller = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sale_lines_sold",
    )
    line_commission = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))

    class Meta:
        verbose_name = "بند بيع"
        verbose_name_plural = "بنود البيع"


class SalePayment(models.Model):
    """تفصيل طرق الدفع عند وجود أكثر من طريقة."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="payments")
    payment_method = models.CharField(max_length=20, choices=Sale.PaymentMethod.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "دفعة بيع"
        verbose_name_plural = "دفعات البيع"


class SaleReturn(models.Model):
    """فاتورة مردودات مبيعات."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        POSTED = "posted", "مرحّلة"
        CANCELLED = "cancelled", "ملغاة"

    class RefundMethod(models.TextChoices):
        CASH = "cash", "نقدي"
        BANK = "bank", "بنك"
        WALLET = "wallet", "محفظة"
        CUSTOMER_ACCOUNT = "customer_account", "حساب العميل"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name="returns")
    branch = models.ForeignKey("Branch", on_delete=models.PROTECT, related_name="sale_returns")
    warehouse = models.ForeignKey("Warehouse", on_delete=models.PROTECT, related_name="sale_returns")
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sale_returns",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.POSTED)
    refund_method = models.CharField(
        max_length=20,
        choices=RefundMethod.choices,
        default=RefundMethod.CASH,
    )
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    down_payment_refund = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
        help_text="مبلغ مقدم مُردود للعميل",
    )
    return_interest = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
        help_text="فوائد تقسيط مرتجعة",
    )
    reason = models.CharField(max_length=300, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="sale_returns_created",
    )
    cash_shift = models.ForeignKey(
        "CashShift",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sale_returns",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "مردود بيع"
        verbose_name_plural = "مردودات المبيعات"


class SaleReturnLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale_return = models.ForeignKey(SaleReturn, on_delete=models.CASCADE, related_name="lines")
    sale_line = models.ForeignKey(SaleLine, on_delete=models.PROTECT, related_name="return_lines")
    variant = models.ForeignKey(
        "ProductVariant",
        on_delete=models.PROTECT,
        related_name="sale_return_lines",
        null=True,
        blank=True,
    )
    composite_product = models.ForeignKey(
        "CompositeProduct",
        on_delete=models.PROTECT,
        related_name="sale_return_lines",
        null=True,
        blank=True,
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0"))
    line_total = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        verbose_name = "بند مردود بيع"
        verbose_name_plural = "بنود مردودات البيع"


class SalesQuotation(models.Model):
    """عرض سعر لا يؤثر على المخزون أو الحسابات."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        SENT = "sent", "مرسل"
        APPROVED = "approved", "موافق عليه"
        CONVERTED = "converted", "تحول لفاتورة"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    branch = models.ForeignKey("Branch", on_delete=models.PROTECT, related_name="sales_quotations")
    warehouse = models.ForeignKey("Warehouse", on_delete=models.PROTECT, related_name="sales_quotations")
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_quotations",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    tax_percent = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    valid_until = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    converted_sale = models.ForeignKey(
        Sale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_quotations",
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="sales_quotations_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "عرض سعر"
        verbose_name_plural = "عروض الأسعار"


class SalesQuotationLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quotation = models.ForeignKey(SalesQuotation, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(
        "ProductVariant",
        on_delete=models.PROTECT,
        related_name="quotation_lines",
        null=True,
        blank=True,
    )
    composite_product = models.ForeignKey(
        "CompositeProduct",
        on_delete=models.PROTECT,
        related_name="quotation_lines",
        null=True,
        blank=True,
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0"))
    line_total = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        verbose_name = "بند عرض سعر"
        verbose_name_plural = "بنود عروض الأسعار"


class CustomerReservation(models.Model):
    """حجز عميل بعربون — لا يخصم المخزون حتى التحويل لفاتورة."""

    class Status(models.TextChoices):
        ACTIVE = "active", "نشط"
        CONVERTED = "converted", "تحول لفاتورة"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    branch = models.ForeignKey("Branch", on_delete=models.PROTECT, related_name="customer_reservations")
    warehouse = models.ForeignKey("Warehouse", on_delete=models.PROTECT, related_name="customer_reservations")
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reservations",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    deposit_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    deposit_method = models.CharField(max_length=20, choices=Sale.PaymentMethod.choices, default=Sale.PaymentMethod.CASH)
    notes = models.TextField(blank=True)
    converted_sale = models.ForeignKey(
        Sale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_reservations",
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="customer_reservations_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "حجز عميل"
        verbose_name_plural = "حجوزات العملاء"


class CustomerReservationLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.ForeignKey(CustomerReservation, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(
        "ProductVariant",
        on_delete=models.PROTECT,
        related_name="reservation_lines",
        null=True,
        blank=True,
    )
    composite_product = models.ForeignKey(
        "CompositeProduct",
        on_delete=models.PROTECT,
        related_name="reservation_lines",
        null=True,
        blank=True,
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0"))
    line_total = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        verbose_name = "بند حجز"
        verbose_name_plural = "بنود الحجوزات"
