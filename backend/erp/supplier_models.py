"""الموردين — أنواع، مجموعات، بيانات المورد، حركة الحساب."""

import uuid
from decimal import Decimal

from django.db import models


class SupplierType(models.Model):
    """طبيعة كيان المورد — مصنع/مكتب/محل/نقطة بيع."""

    class EntityKind(models.TextChoices):
        ESTABLISHMENT = "establishment", "منشأة / مصنع"
        OFFICE = "office", "مكتب"
        ESTABLISHMENT_OFFICE = "establishment_office", "منشأة ومكتب"
        SHOP = "shop", "محل"
        POS_POINT = "pos_point", "نقطة بيع"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    entity_kind = models.CharField(
        max_length=30,
        choices=EntityKind.choices,
        default=EntityKind.ESTABLISHMENT,
    )
    description = models.TextField(blank=True)
    is_system = models.BooleanField(
        default=False,
        help_text="نوع افتراضي من النظام — لا يُحذف",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "نوع مورد"
        verbose_name_plural = "أنواع الموردين"

    def __str__(self):
        return self.name_ar


class SupplierCategory(models.Model):
    """تصنيف المورد — محلي، مستورد، جملة، قطاعي…"""

    class CategoryKind(models.TextChoices):
        LOCAL = "local", "موردين محليين"
        IMPORTED = "imported", "موردين مستوردين"
        WHOLESALE = "wholesale", "موردين جملة"
        RETAIL = "retail", "موردين قطاعى"
        STRATEGIC = "strategic", "موردين استراتيجيين"
        SEASONAL = "seasonal", "موردين موسميين"
        OTHER = "other", "أخرى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    category_kind = models.CharField(
        max_length=30,
        choices=CategoryKind.choices,
        default=CategoryKind.OTHER,
    )
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "مجموعة تصنيف مورد"
        verbose_name_plural = "مجموعات تصنيف الموردين"

    def __str__(self):
        return self.name_ar


class SupplierDepartment(models.Model):
    """قسم المورد — حريمي، رجالي، أطفال، أحذية، شنط…"""

    class DeptKind(models.TextChoices):
        WOMEN = "women", "حريمى"
        MEN = "men", "رجالى"
        CHILDREN = "children", "أطفالى"
        SHOES = "shoes", "أحذية"
        BAGS = "bags", "شنط"
        ACCESSORIES = "accessories", "إكسسوارات"
        WATCHES = "watches", "ساعات"
        COSMETICS = "cosmetics", "مستحضرات تجميل"
        SPORTSWEAR = "sportswear", "ملابس رياضية"
        OTHER = "other", "أخرى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    dept_kind = models.CharField(
        max_length=30,
        choices=DeptKind.choices,
        default=DeptKind.OTHER,
    )
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "قسم مورد"
        verbose_name_plural = "أقسام الموردين"

    def __str__(self):
        return self.name_ar


class SupplierGroup(models.Model):
    """سياسة التعامل المالي مع المورد."""

    class SettlementMode(models.TextChoices):
        CONSIGNMENT = "consignment", "أمانات"
        CASH = "cash", "نقدي"
        CREDIT_WITH_RETURNS = "credit_returns", "أجل ومرتجعات بمواعيد"
        CREDIT_NO_RETURNS = "credit_no_returns", "أجل بدون مرتجعات"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    settlement_mode = models.CharField(
        max_length=30,
        choices=SettlementMode.choices,
        default=SettlementMode.CONSIGNMENT,
    )
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "مجموعة موردين"
        verbose_name_plural = "مجموعات الموردين"

    def __str__(self):
        return self.name_ar


class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    supplier_type = models.ForeignKey(
        SupplierType,
        on_delete=models.PROTECT,
        related_name="suppliers",
    )
    supplier_group = models.ForeignKey(
        SupplierGroup,
        on_delete=models.PROTECT,
        related_name="suppliers",
    )
    supplier_category = models.ForeignKey(
        SupplierCategory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="suppliers",
    )
    supplier_department = models.ForeignKey(
        SupplierDepartment,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="suppliers",
    )
    class WeeklyInventoryDay(models.TextChoices):
        SATURDAY = "saturday", "السبت"
        SUNDAY = "sunday", "الأحد"
        MONDAY = "monday", "الإثنين"
        TUESDAY = "tuesday", "الثلاثاء"
        WEDNESDAY = "wednesday", "الأربعاء"
        THURSDAY = "thursday", "الخميس"
        FRIDAY = "friday", "الجمعة"

    contact_name = models.CharField(max_length=200, blank=True, help_text="اسم الشخص المسئول")
    contact_title = models.CharField(max_length=120, blank=True, help_text="المسمى الوظيفي")
    phone = models.CharField(max_length=30, blank=True)
    whatsapp = models.CharField(max_length=30, blank=True)
    weekly_inventory_day = models.CharField(
        max_length=12,
        choices=WeeklyInventoryDay.choices,
        blank=True,
        default="",
        help_text="يوم إرسال كشف الجرد الأسبوعي للمورد",
    )
    is_also_customer = models.BooleanField(
        default=False,
        help_text="المورد يشتري منا أيضاً — يرتبط بحساب عميل",
    )
    linked_customer = models.ForeignKey(
        "Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_supplier",
        help_text="حساب العميل المرتبط عند تفعيل «مورد عميل أيضاً»",
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "مورد"
        verbose_name_plural = "الموردين"

    def __str__(self):
        return self.name_ar


class SupplierAccountEntry(models.Model):
    """قيد على حساب المورد — مثلاً من إشعار خصم مورد."""

    class EntryType(models.TextChoices):
        DEBIT = "debit", "مدين — زيادة المديونية للمورد"
        CREDIT = "credit", "دائن — تخفيض المديونية / رصيد لصالح المحل"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name="account_entries"
    )
    price_adjustment = models.ForeignKey(
        "PriceAdjustment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_entries",
    )
    sale = models.ForeignKey(
        "Sale",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_entries",
    )
    purchase_invoice = models.ForeignKey(
        "PurchaseInvoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_entries",
    )
    entry_type = models.CharField(max_length=10, choices=EntryType.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "حركة حساب مورد"
        verbose_name_plural = "حركات حسابات الموردين"

    def __str__(self):
        return f"{self.code} — {self.supplier_id}"


class SupplierPayment(models.Model):
    """إذن دفع مورد — يُسجّل في حساب المورد عند الاعتماد."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        APPROVED = "approved", "معتمد"
        CANCELLED = "cancelled", "ملغى"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "نقدي"
        BANK = "bank", "تحويل بنكي"
        BANK_ACCOUNT = "bank_account", "حساب بنكي"
        WALLET = "wallet", "محفظة إلكترونية"
        CHEQUE = "cheque", "شيك"
        PROMISSORY_NOTE = "promissory_note", "كمبيالة"
        OTHER_PAPERS = "other_papers", "أوراق دفع أخرى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name="payments"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    paper_cheque_number = models.CharField(max_length=64, blank=True)
    paper_bank_account = models.ForeignKey(
        "BankAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_payment_papers",
    )
    paper_due_date = models.DateField(null=True, blank=True)
    account_entry = models.OneToOneField(
        SupplierAccountEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment",
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="supplier_payments_created",
    )
    approved_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_payments_approved",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "إذن دفع مورد"
        verbose_name_plural = "إذونات دفع الموردين"

    def __str__(self):
        return self.code


class SupplierWeeklyInventoryReport(models.Model):
    """كشف جرد أسبوعي للمورد — يُنشأ تلقائياً في اليوم المحدد."""

    class Status(models.TextChoices):
        GENERATED = "generated", "تم الإنشاء"
        SENT = "sent", "تم الإرسال"
        FAILED = "failed", "فشل الإرسال"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="weekly_inventory_reports",
    )
    report_date = models.DateField()
    week_start = models.DateField()
    week_end = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.GENERATED,
    )
    payload = models.JSONField(default=dict, blank=True)
    whatsapp_sent_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-report_date", "-created_at"]
        verbose_name = "كشف جرد مورد أسبوعي"
        verbose_name_plural = "كشوف جرد الموردين الأسبوعية"
        constraints = [
            models.UniqueConstraint(
                fields=["supplier", "report_date"],
                name="uniq_supplier_weekly_report_date",
            )
        ]

    def __str__(self):
        return f"{self.code} — {self.supplier_id} @ {self.report_date}"
