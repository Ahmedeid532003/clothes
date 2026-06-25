"""الأصناف، المتغيرات (مقاس×لون)، أرصدة المخزون، إذونات الحركة."""

import uuid
from decimal import Decimal

from django.db import models


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    barcode = models.CharField(max_length=64, blank=True, db_index=True)
    name_ar = models.CharField(max_length=300)
    name_en = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    brand = models.ForeignKey(
        "Brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    section = models.ForeignKey(
        "ProductSection",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    classification = models.ForeignKey(
        "ProductClassification",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    supplier = models.ForeignKey(
        "Supplier",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    season = models.ForeignKey(
        "Season",
        on_delete=models.PROTECT,
        related_name="products",
    )
    purchase_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    markup_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0")
    )
    sale_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    offer_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    reorder_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0"),
        help_text="نسبة حد الطلب من المبيعات",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "صنف"
        verbose_name_plural = "الأصناف"

    def __str__(self):
        return f"{self.code} — {self.name_ar}"


class ProductVariant(models.Model):
    """SKU = صنف + مقاس + لون."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    size = models.ForeignKey(
        "ProductSize", on_delete=models.PROTECT, related_name="variants"
    )
    color = models.ForeignKey(
        "ProductColor", on_delete=models.PROTECT, related_name="variants"
    )
    barcode = models.CharField(max_length=64, blank=True, db_index=True)
    purchase_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    sale_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    offer_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("product", "size", "color")]
        verbose_name = "متغير صنف"
        verbose_name_plural = "متغيرات الأصناف"

    def __str__(self):
        return f"{self.product.code} / {self.size.code} / {self.color.code}"


class StockBalance(models.Model):
    warehouse = models.ForeignKey(
        "Warehouse", on_delete=models.CASCADE, related_name="balances"
    )
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="balances"
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))

    class Meta:
        unique_together = [("warehouse", "variant")]
        verbose_name = "رصيد مخزن"
        verbose_name_plural = "أرصدة المخازن"


class StockTransfer(models.Model):
    """إذن تحويل بين مخزن/فرع."""

    class TransferType(models.TextChoices):
        WAREHOUSE_WAREHOUSE = "warehouse_warehouse", "مخزن → مخزن"
        WAREHOUSE_BRANCH = "warehouse_branch", "مخزن → منفذ بيع"
        BRANCH_BRANCH = "branch_branch", "منفذ بيع → منفذ بيع"

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        PENDING = "pending", "بانتظار الموافقة"
        APPROVED = "approved", "معتمد"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    transfer_type = models.CharField(
        max_length=30,
        choices=TransferType.choices,
        default=TransferType.WAREHOUSE_WAREHOUSE,
    )
    from_warehouse = models.ForeignKey(
        "Warehouse", on_delete=models.PROTECT, related_name="transfers_out"
    )
    to_warehouse = models.ForeignKey(
        "Warehouse", on_delete=models.PROTECT, related_name="transfers_in"
    )
    from_branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers_out_branch",
    )
    to_branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers_in_branch",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    requires_approval = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, related_name="transfers_created"
    )
    approved_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers_approved",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "إذن تحويل"
        verbose_name_plural = "إذونات التحويل"


class StockTransferLine(models.Model):
    transfer = models.ForeignKey(
        StockTransfer, on_delete=models.CASCADE, related_name="lines"
    )
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)

    class Meta:
        verbose_name = "بند تحويل"
        verbose_name_plural = "بنود التحويل"


class StockScrap(models.Model):
    """إذن هالك / تالف."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        APPROVED = "approved", "معتمد"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    warehouse = models.ForeignKey(
        "Warehouse", on_delete=models.PROTECT, related_name="scraps"
    )
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, related_name="scraps_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "إذن هالك"
        verbose_name_plural = "إذونات الهالك"


class StockScrapLine(models.Model):
    scrap = models.ForeignKey(StockScrap, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)

    class Meta:
        verbose_name = "بند هالك"
        verbose_name_plural = "بنود الهالك"


class StockDisbursement(models.Model):
    """إذن صرف — خروج بضاعة من المخزن (تقليل الرصيد)."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        APPROVED = "approved", "معتمد"
        CANCELLED = "cancelled", "ملغى"

    class Purpose(models.TextChoices):
        SALE = "sale", "بيع"
        SAMPLE = "sample", "عينة"
        INTERNAL_USE = "internal_use", "استخدام داخلي"
        OTHER = "other", "أخرى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    warehouse = models.ForeignKey(
        "Warehouse", on_delete=models.PROTECT, related_name="disbursements"
    )
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="disbursements_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "إذن صرف"
        verbose_name_plural = "أذون الصرف"


class StockDisbursementLine(models.Model):
    disbursement = models.ForeignKey(
        StockDisbursement, on_delete=models.CASCADE, related_name="lines"
    )
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)

    class Meta:
        verbose_name = "بند صرف"
        verbose_name_plural = "بنود الصرف"


class StockAddition(models.Model):
    """إذن إضافة — دخول بضاعة للمخزن (زيادة الرصيد)."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        APPROVED = "approved", "معتمد"
        CANCELLED = "cancelled", "ملغى"

    class Purpose(models.TextChoices):
        SUPPLIER_PURCHASE = "supplier_purchase", "شراء من المورد"
        CUSTOMER_RETURN = "customer_return", "مرتجع من عميل"
        OTHER = "other", "أخرى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    warehouse = models.ForeignKey(
        "Warehouse", on_delete=models.PROTECT, related_name="additions"
    )
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="additions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "إذن إضافة"
        verbose_name_plural = "أذون الإضافة"


class StockAdditionLine(models.Model):
    addition = models.ForeignKey(
        StockAddition, on_delete=models.CASCADE, related_name="lines"
    )
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)

    class Meta:
        verbose_name = "بند إضافة"
        verbose_name_plural = "بنود الإضافة"


class StockCount(models.Model):
    """جرد مخزن — مقارنة فعلي vs دفتر."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        APPROVED = "approved", "معتمد"
        CANCELLED = "cancelled", "ملغى"

    class CountMode(models.TextChoices):
        FILTER = "filter", "حسب الفلتر"
        ORDER = "order", "أصناف الأوردر فقط"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_counts",
    )
    warehouse = models.ForeignKey(
        "Warehouse", on_delete=models.PROTECT, related_name="stock_counts"
    )
    count_mode = models.CharField(
        max_length=20,
        choices=CountMode.choices,
        default=CountMode.FILTER,
    )
    scan_order = models.ForeignKey(
        "ScanOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_counts",
    )
    supplier = models.ForeignKey(
        "Supplier",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_counts",
    )
    supplier_group = models.ForeignKey(
        "SupplierGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_counts",
    )
    section = models.ForeignKey(
        "ProductSection",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_counts",
    )
    brand = models.ForeignKey(
        "Brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_counts",
    )
    classification = models.ForeignKey(
        "ProductClassification",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_counts",
    )
    product = models.ForeignKey(
        "Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_counts",
    )
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    addition_voucher = models.ForeignKey(
        "StockAddition",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_stock_counts",
    )
    disbursement_voucher = models.ForeignKey(
        "StockDisbursement",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_stock_counts",
    )
    created_by = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, related_name="counts_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "جرد مخزن"
        verbose_name_plural = "جرد المخازن"


class StockCountLine(models.Model):
    stock_count = models.ForeignKey(
        StockCount, on_delete=models.CASCADE, related_name="lines"
    )
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT)
    system_qty = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))
    counted_qty = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))

    class Meta:
        verbose_name = "بند جرد"
        verbose_name_plural = "بنود الجرد"


class CompositeProduct(models.Model):
    """صنف مركب / عرض (خصم قطعة من كل مكوّن عند البيع لاحقاً)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    barcode = models.CharField(max_length=64, blank=True, db_index=True)
    name_ar = models.CharField(max_length=300)
    name_en = models.CharField(max_length=300, blank=True)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    offer_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "صنف مركب"
        verbose_name_plural = "أصناف مركبة"


class CompositeProductLine(models.Model):
    composite = models.ForeignKey(
        CompositeProduct, on_delete=models.CASCADE, related_name="lines"
    )
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("1"))

    class Meta:
        verbose_name = "مكوّن عرض"
        verbose_name_plural = "مكوّنات العرض"


class PriceAdjustment(models.Model):
    """سجل تعديل أسعار جماعي."""

    class Scope(models.TextChoices):
        CARD = "card", "كارت الصنف"
        SUPPLIER = "supplier", "حساب المورد"

    class Target(models.TextChoices):
        SALE = "sale", "سعر البيع"
        OFFER = "offer", "سعر العرض"
        PURCHASE = "purchase", "سعر التكلفة"

    class Mode(models.TextChoices):
        PERCENT = "percent", "نسبة"
        AMOUNT = "amount", "مبلغ"

    class Direction(models.TextChoices):
        INCREASE = "increase", "زيادة"
        DECREASE = "decrease", "خصم"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    scope = models.CharField(max_length=20, choices=Scope.choices, default=Scope.CARD)
    target = models.CharField(max_length=20, choices=Target.choices, default=Target.SALE)
    mode = models.CharField(max_length=20, choices=Mode.choices, default=Mode.PERCENT)
    direction = models.CharField(max_length=20, choices=Direction.choices, default=Direction.DECREASE)
    value = models.DecimalField(max_digits=12, decimal_places=2)
    supplier = models.ForeignKey(
        "Supplier", on_delete=models.SET_NULL, null=True, blank=True
    )
    season = models.ForeignKey("Season", on_delete=models.SET_NULL, null=True, blank=True)
    brand = models.ForeignKey("Brand", on_delete=models.SET_NULL, null=True, blank=True)
    section = models.ForeignKey(
        "ProductSection", on_delete=models.SET_NULL, null=True, blank=True
    )
    offer_starts_at = models.DateField(null=True, blank=True)
    offer_ends_at = models.DateField(null=True, blank=True)
    products_affected = models.PositiveIntegerField(default=0)
    supplier_account_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="صافي أثر التعديل على حساب المورد (موجب = زيادة المديونية)",
    )
    created_by = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, related_name="price_adjustments"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "تعديل أسعار"
        verbose_name_plural = "تعديلات الأسعار"


class OkazionNoticeLine(models.Model):
    """بند إشعار خصم أوكازيون — تفاصيل كل صنف."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notice = models.ForeignKey(
        PriceAdjustment, on_delete=models.CASCADE, related_name="okazion_lines"
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="okazion_lines")
    qty = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))
    mode = models.CharField(max_length=20, default=PriceAdjustment.Mode.PERCENT)
    value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    markup_percent = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0"))
    old_purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    new_purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    old_sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    new_offer_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    total_discount_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    excluded = models.BooleanField(default=False)

    class Meta:
        verbose_name = "بند أوكازيون"
        verbose_name_plural = "بنود أوكازيون"
        indexes = [models.Index(fields=["notice", "product"])]


class StoreOfferNoticeLine(models.Model):
    """بند إشعار عروض عامة — خصم على سعر البيع فقط."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notice = models.ForeignKey(
        PriceAdjustment, on_delete=models.CASCADE, related_name="store_offer_lines"
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="store_offer_lines"
    )
    qty = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))
    mode = models.CharField(max_length=20, default=PriceAdjustment.Mode.PERCENT)
    value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    old_sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    new_offer_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    total_discount_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    excluded = models.BooleanField(default=False)

    class Meta:
        verbose_name = "بند عرض عام"
        verbose_name_plural = "بنود العروض العامة"
        indexes = [models.Index(fields=["notice", "product"])]


class BranchOfferPrice(models.Model):
    """سعر عرض أوكازيون لفرع محدد — دون التأثير على باقي الفروع."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey("Branch", on_delete=models.CASCADE, related_name="branch_offer_prices")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="branch_offer_prices")
    offer_price = models.DecimalField(max_digits=12, decimal_places=2)
    notice = models.ForeignKey(
        PriceAdjustment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="branch_offers",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("branch", "product")]
        verbose_name = "سعر عرض فرع"
        verbose_name_plural = "أسعار عرض الفروع"
