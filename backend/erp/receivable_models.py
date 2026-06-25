"""ذمم العملاء — فواتير آجلة، تحصيل، أقساط، متابعات وتذكيرات."""

import uuid
from decimal import Decimal

from django.db import models


class ReceivableInvoice(models.Model):
    """فاتورة/ذمة مفتوحة على العميل."""

    class Status(models.TextChoices):
        OPEN = "open", "مفتوحة"
        PARTIAL = "partial", "جزئية"
        PAID = "paid", "مسددة"
        OVERDUE = "overdue", "متأخرة"
        WRITTEN_OFF = "written_off", "مشطوبة"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    customer = models.ForeignKey(
        "Customer", on_delete=models.PROTECT, related_name="receivable_invoices"
    )
    sale = models.ForeignKey(
        "Sale",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="receivable_invoices",
    )
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="receivable_invoices",
    )
    issue_date = models.DateField()
    due_date = models.DateField(db_index=True)
    amount_total = models.DecimalField(max_digits=14, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    salesperson = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="receivable_invoices_assigned",
    )
    notes = models.TextField(blank=True)
    block_new_sales = models.BooleanField(
        default=False, help_text="منع إصدار فاتورة جديدة لهذا العميل"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-due_date", "code"]
        verbose_name = "ذمة عميل"
        verbose_name_plural = "ذمم العملاء"

    @property
    def balance(self) -> Decimal:
        return (self.amount_total - self.amount_paid).quantize(Decimal("0.01"))

    def __str__(self):
        return self.code


class ReceivablePayment(models.Model):
    """تحصيل من العميل."""

    class Method(models.TextChoices):
        CASH = "cash", "نقدي"
        BANK = "bank", "تحويل"
        CHEQUE = "cheque", "شيك"
        CARD = "card", "بطاقة"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    customer = models.ForeignKey(
        "Customer", on_delete=models.PROTECT, related_name="receivable_payments"
    )
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    reference = models.CharField(max_length=120, blank=True)
    allocations = models.JSONField(
        default=list,
        blank=True,
        help_text='[{"invoice_id": "...", "amount": "1000"}]',
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="receivable_payments_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date", "code"]


class InstallmentPlanTemplate(models.Model):
    """قالب خطة أقساط."""

    class Frequency(models.TextChoices):
        WEEKLY = "weekly", "أسبوعي"
        BIWEEKLY = "biweekly", "كل أسبوعين"
        MONTHLY = "monthly", "شهري"

    class InterestBase(models.TextChoices):
        BEFORE_DOWN_PAYMENT = "before_down_payment", "على إجمالي الفاتورة"
        AFTER_DOWN_PAYMENT = "after_down_payment", "على المتبقي بعد المقدم"

    class InterestType(models.TextChoices):
        PERCENT = "percent", "نسبة"
        FIXED = "fixed", "مبلغ ثابت"

    class PeriodUnit(models.TextChoices):
        DAYS = "days", "أيام"
        MONTHS = "months", "أشهر"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    frequency = models.CharField(
        max_length=20, choices=Frequency.choices, default=Frequency.MONTHLY
    )
    default_num_installments = models.PositiveSmallIntegerField(default=6)
    down_payment_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0")
    )
    interest_base = models.CharField(
        max_length=30,
        choices=InterestBase.choices,
        default=InterestBase.AFTER_DOWN_PAYMENT,
    )
    interest_type = models.CharField(
        max_length=20, choices=InterestType.choices, default=InterestType.PERCENT
    )
    interest_rate_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0")
    )
    interest_fixed_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    auto_add_interest = models.BooleanField(default=True)
    penalty_rate_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0")
    )
    penalty_fixed_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    grace_days = models.PositiveSmallIntegerField(default=0)
    first_due_after_days = models.PositiveSmallIntegerField(default=30)
    early_settlement_discount_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0")
    )
    penalty_rules = models.JSONField(default=dict, blank=True)
    period_unit = models.CharField(
        max_length=10,
        choices=PeriodUnit.choices,
        default=PeriodUnit.MONTHS,
    )
    interval_days = models.PositiveSmallIntegerField(
        default=30,
        help_text="الفترة بالأيام عند اختيار تقسيط يومي",
    )
    penalty_day_of_month = models.PositiveSmallIntegerField(
        default=15,
        help_text="يوم إضافة غرامة التأخير من الشهر التالي",
    )
    show_interest_on_receipt = models.BooleanField(default=True)
    show_penalty_on_receipt = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]


class InstallmentContract(models.Model):
    """عقد أقساط على عميل."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        PENDING_APPROVAL = "pending_approval", "بانتظار الموافقة"
        ACTIVE = "active", "نشط"
        COMPLETED = "completed", "مكتمل"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    customer = models.ForeignKey(
        "Customer", on_delete=models.PROTECT, related_name="installment_contracts"
    )
    plan = models.ForeignKey(
        InstallmentPlanTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contracts",
    )
    receivable = models.ForeignKey(
        ReceivableInvoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installment_contracts",
    )
    sale = models.ForeignKey(
        "Sale",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installment_contracts",
    )
    principal_amount = models.DecimalField(max_digits=14, decimal_places=2)
    down_payment_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    interest_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    financed_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_contract_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    num_installments = models.PositiveSmallIntegerField()
    installment_amount = models.DecimalField(max_digits=14, decimal_places=2)
    interest_rate_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0")
    )
    penalty_rate_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0")
    )
    penalty_fixed_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    grace_days = models.PositiveSmallIntegerField(default=0)
    early_settlement_allowed = models.BooleanField(default=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    approved_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installment_contracts_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="installment_contracts_created",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class InstallmentLine(models.Model):
    """قسط في جدول السداد."""

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "مجدول"
        DUE = "due", "مستحق"
        PAID = "paid", "مسدد"
        LATE = "late", "متأخر"
        DEFERRED = "deferred", "مؤجل"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(
        InstallmentContract, on_delete=models.CASCADE, related_name="lines"
    )
    sequence = models.PositiveSmallIntegerField()
    due_date = models.DateField(db_index=True)
    amount_due = models.DecimalField(max_digits=14, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    penalty_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    deferred_to = models.DateField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    parent_line = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="split_children",
    )
    notes = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["contract", "sequence"]
        unique_together = [("contract", "sequence")]

    @property
    def balance(self) -> Decimal:
        return (self.amount_due + self.penalty_amount - self.amount_paid).quantize(
            Decimal("0.01")
        )


class CustomerFollowUp(models.Model):
    """متابعة مجدولة."""

    class Channel(models.TextChoices):
        CALL = "call", "اتصال"
        WHATSAPP = "whatsapp", "واتساب"
        SMS = "sms", "SMS"
        EMAIL = "email", "بريد"
        VISIT = "visit", "زيارة"

    class Status(models.TextChoices):
        PENDING = "pending", "قيد الانتظار"
        DONE = "done", "تمت"
        CANCELLED = "cancelled", "ملغاة"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        "Customer", on_delete=models.CASCADE, related_name="follow_ups"
    )
    assigned_to = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="customer_follow_ups",
    )
    scheduled_at = models.DateTimeField(db_index=True)
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.CALL)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class CustomerReminder(models.Model):
    """تذكير تلقائي / مجدول."""

    class Channel(models.TextChoices):
        WHATSAPP = "whatsapp", "واتساب"
        SMS = "sms", "SMS"
        EMAIL = "email", "بريد"
        IN_APP = "in_app", "داخل النظام"

    class Status(models.TextChoices):
        QUEUED = "queued", "في الانتظار"
        SENT = "sent", "مُرسل"
        FAILED = "failed", "فشل"
        CANCELLED = "cancelled", "ملغى"

    class Trigger(models.TextChoices):
        AUTO_OVERDUE = "auto_overdue", "تأخير تلقائي"
        SCHEDULER = "scheduler", "مجدول"
        MANUAL = "manual", "يدوي"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        "Customer", on_delete=models.CASCADE, related_name="reminders"
    )
    channel = models.CharField(max_length=20, choices=Channel.choices)
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    scheduled_at = models.DateTimeField(db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    trigger = models.CharField(max_length=30, choices=Trigger.choices, default=Trigger.MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)


class InstallmentFollowUpSavedList(models.Model):
    """ليسته محفوظة من متابع الأقساط — رقم معرّف + لقطة الفلاتر."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    list_number = models.CharField(max_length=80, unique=True, db_index=True)
    filter_snapshot = models.JSONField(default=dict, blank=True)
    filter_summary = models.CharField(max_length=500, blank=True)
    customer_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installment_followup_saved_lists",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "ليسته متابع أقساط"
        verbose_name_plural = "ليستات متابع الأقساط"

    def __str__(self):
        return self.list_number
