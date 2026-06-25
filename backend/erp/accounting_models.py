"""حسابات — شجرة حسابات، مراكز تكلفة، أنواع المصروفات العامة."""

import uuid

from django.db import models


class GlAccount(models.Model):
    """حساب في شجرة الحسابات — هيكل هرمي لا نهائي."""

    class AccountType(models.TextChoices):
        ASSET = "asset", "أصول"
        LIABILITY = "liability", "التزامات"
        EQUITY = "equity", "حقوق ملكية"
        REVENUE = "revenue", "إيرادات"
        EXPENSE = "expense", "مصروفات"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.ASSET,
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="children",
    )
    code_segment = models.CharField(max_length=12, blank=True)
    level = models.PositiveSmallIntegerField(default=0)
    tree_path = models.CharField(max_length=500, blank=True, db_index=True)
    cost_center = models.ForeignKey(
        "CostCenter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gl_accounts",
    )
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gl_accounts",
    )
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["tree_path", "code"]
        verbose_name = "حساب"
        verbose_name_plural = "شجرة الحسابات"

    def __str__(self):
        return f"{self.code} — {self.name_ar}"


class Currency(models.Model):
    """عملة — الجنيه أساس النظام."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=3, unique=True)
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100, blank=True)
    symbol = models.CharField(max_length=8, blank=True)
    rate_to_base = models.DecimalField(
        max_digits=14,
        decimal_places=6,
        default=1,
        help_text="عدد وحدات العملة الأساس (EGP) لكل 1 من هذه العملة",
    )
    is_base = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "عملة"
        verbose_name_plural = "العملات"

    def __str__(self):
        return f"{self.code} ({self.symbol})"


class FixedAsset(models.Model):
    """أصل ثابت — إهلاك دوري."""

    class Category(models.TextChoices):
        DEVICE = "device", "أجهزة"
        VEHICLE = "vehicle", "سيارات"
        FURNITURE = "furniture", "أثاث"
        EQUIPMENT = "equipment", "معدات"

    class DepreciationMethod(models.TextChoices):
        STRAIGHT_LINE = "straight_line", "قسط ثابت"
        DECLINING = "declining", "متناقص"

    class Status(models.TextChoices):
        ACTIVE = "active", "نشط"
        FULLY_DEPRECIATED = "fully_depreciated", "مستهلك بالكامل"
        DISPOSED = "disposed", "مستبعد"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.DEVICE)
    acquisition_date = models.DateField()
    cost = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name="fixed_assets",
        null=True,
        blank=True,
    )
    useful_life_months = models.PositiveSmallIntegerField(default=36)
    depreciation_method = models.CharField(
        max_length=20,
        choices=DepreciationMethod.choices,
        default=DepreciationMethod.STRAIGHT_LINE,
    )
    depreciation_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        help_text="نسبة سنوية للمتناقص (مثلاً 25)",
    )
    gl_asset = models.ForeignKey(
        GlAccount,
        on_delete=models.PROTECT,
        related_name="fixed_assets_as_asset",
    )
    gl_accumulated = models.ForeignKey(
        GlAccount,
        on_delete=models.PROTECT,
        related_name="fixed_assets_as_accumulated",
    )
    gl_expense = models.ForeignKey(
        GlAccount,
        on_delete=models.PROTECT,
        related_name="fixed_assets_as_expense",
    )
    accumulated_depreciation = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fixed_assets",
    )
    cost_center = models.ForeignKey(
        "CostCenter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fixed_assets",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    @property
    def book_value(self):
        return self.cost - self.accumulated_depreciation


class DepreciationEntry(models.Model):
    """قيد إهلاك شهري."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    asset = models.ForeignKey(FixedAsset, on_delete=models.PROTECT, related_name="depreciation_entries")
    period = models.CharField(max_length=7, help_text="YYYY-MM")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    journal_entry = models.ForeignKey(
        "JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="depreciation_entries",
    )
    posted_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="depreciation_entries_created",
    )

    class Meta:
        ordering = ["-period", "-posted_at"]
        constraints = [
            models.UniqueConstraint(fields=["asset", "period"], name="uniq_depreciation_per_period"),
        ]


class CostCenter(models.Model):
    """مركز تكلفة — يمكن ربطه بفرع."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cost_centers",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "مركز تكلفة"
        verbose_name_plural = "مراكز التكلفة"

    def __str__(self):
        return f"{self.code} — {self.name_ar}"


class GeneralExpenseType(models.Model):
    """
    نوع مصروف عام — تصنيف هرمي لا نهائي.
    كود ذكي: EXP-001 (جذر) → EXP-MNT-002 (فرعي) → EXP-MNT-DEV-003 (أعمق).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=40, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="children",
    )
    code_segment = models.CharField(
        max_length=12,
        blank=True,
        help_text="جزء الكود الوسطي (مثل MNT, NET) — اختياري للتوليد التلقائي",
    )
    level = models.PositiveSmallIntegerField(default=0)
    tree_path = models.CharField(max_length=500, blank=True, db_index=True)
    gl_account = models.ForeignKey(
        GlAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_types",
    )
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_types",
    )
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_types",
    )
    department = models.ForeignKey(
        "Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_types",
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["tree_path", "code"]
        verbose_name = "نوع مصروف عام"
        verbose_name_plural = "أنواع المصروفات العامة"
        constraints = [
            models.UniqueConstraint(
                fields=["parent", "name_ar"],
                condition=models.Q(is_active=True),
                name="uniq_active_expense_type_name_per_parent",
            ),
        ]

    def __str__(self):
        return f"{self.code} — {self.name_ar}"


class Treasury(models.Model):
    """خزنة نقدية أو حساب بنكي — مصدر الصرف."""

    class TreasuryKind(models.TextChoices):
        CASH = "cash", "خزنة نقدية"
        BANK = "bank", "بنك / تحويل"
        E_WALLET = "e_wallet", "محفظة إلكترونية"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    kind = models.CharField(max_length=20, choices=TreasuryKind.choices, default=TreasuryKind.CASH)
    gl_account = models.ForeignKey(
        GlAccount,
        on_delete=models.PROTECT,
        related_name="treasuries",
    )
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treasuries",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "خزنة"
        verbose_name_plural = "الخزائن والبنوك"

    def __str__(self):
        return f"{self.code} — {self.name_ar}"


class AccountingSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    expense_approval_limit = models.DecimalField(max_digits=14, decimal_places=2, default=5000)
    user_transfer_limit = models.DecimalField(max_digits=14, decimal_places=2, default=10000)
    handover_requires_review_on_diff = models.BooleanField(default=True)
    block_new_shift_if_pending = models.BooleanField(default=True)
    stale_shift_hours = models.PositiveSmallIntegerField(default=12)
    auto_close_enabled = models.BooleanField(default=True)
    auto_close_hour = models.PositiveSmallIntegerField(default=23)
    require_open_shift_for_pos = models.BooleanField(default=True)
    chief_treasury = models.ForeignKey(
        Treasury,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chief_for_shifts",
    )
    updated_at = models.DateTimeField(auto_now=True)


class JournalEntry(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        APPROVED = "approved", "معتمد"
        POSTED = "posted", "مرحّل"
        VOID = "void", "ملغى"

    class EntryKind(models.TextChoices):
        MANUAL = "manual", "يدوي"
        SYSTEM = "system", "آلي"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    entry_date = models.DateField()
    description = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    entry_kind = models.CharField(
        max_length=20,
        choices=EntryKind.choices,
        default=EntryKind.MANUAL,
    )
    source_type = models.CharField(max_length=40, blank=True)
    source_id = models.UUIDField(null=True, blank=True)
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries",
    )
    cost_center = models.ForeignKey(
        "CostCenter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries",
    )
    currency = models.ForeignKey(
        "Currency",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries",
    )
    total_debit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_credit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    posted_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="journal_entries_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-entry_date", "-created_at"]


class JournalLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name="lines")
    gl_account = models.ForeignKey(GlAccount, on_delete=models.PROTECT, related_name="journal_lines")
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    line_order = models.PositiveSmallIntegerField(default=0)
    memo = models.CharField(max_length=300, blank=True)
    cost_center = models.ForeignKey(
        "CostCenter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_lines",
    )

    class Meta:
        ordering = ["line_order"]


class CashShift(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "مفتوحة"
        CLOSED = "closed", "مغلقة"
        APPROVED = "approved", "معتمدة"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    employee = models.ForeignKey("User", on_delete=models.PROTECT, related_name="cash_shifts")
    branch = models.ForeignKey("Branch", on_delete=models.PROTECT, related_name="cash_shifts")
    treasury = models.ForeignKey(Treasury, on_delete=models.PROTECT, related_name="cash_shifts")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    expected_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    actual_balance = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    difference = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    closed_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cash_shifts_closed",
    )
    approved_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cash_shifts_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    handover_status = models.CharField(
        max_length=20,
        choices=[
            ("none", "بدون تسليم"),
            ("pending", "بانتظار الاستلام"),
            ("completed", "تم التسليم"),
        ],
        default="none",
    )
    report_snapshot = models.JSONField(default=dict, blank=True)
    handover_receipt_code = models.CharField(max_length=30, blank=True)
    received_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cash_shifts_received",
    )
    received_at = models.DateTimeField(null=True, blank=True)
    received_treasury = models.ForeignKey(
        Treasury,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cash_shifts_received_into",
    )

    class Meta:
        ordering = ["-opened_at"]


class ShiftHandover(models.Model):
    """تسليم واستلام عهدة مالية بين موظفين."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        PENDING_REVIEW = "pending_review", "بانتظار المراجعة"
        SENDER_SIGNED = "sender_signed", "وقّع المسلّم"
        RECEIVED = "received", "استلم المستلم"
        COMPLETED = "completed", "مكتمل"
        REJECTED = "rejected", "مرفوض"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    from_shift = models.ForeignKey(
        CashShift, on_delete=models.PROTECT, related_name="handovers_out"
    )
    to_shift = models.ForeignKey(
        CashShift,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handovers_in",
    )
    from_employee = models.ForeignKey(
        "User", on_delete=models.PROTECT, related_name="handovers_sent"
    )
    to_employee = models.ForeignKey(
        "User", on_delete=models.PROTECT, related_name="handovers_received"
    )
    treasury = models.ForeignKey(Treasury, on_delete=models.PROTECT, related_name="handovers")
    branch = models.ForeignKey("Branch", on_delete=models.PROTECT, related_name="handovers")
    expected_balance = models.DecimalField(max_digits=14, decimal_places=2)
    actual_balance = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    received_balance = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    difference = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    difference_reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    requires_review = models.BooleanField(default=False)
    mandatory_count_done = models.BooleanField(default=False)
    sender_signed_at = models.DateTimeField(null=True, blank=True)
    sender_signature = models.CharField(max_length=64, blank=True)
    receiver_signed_at = models.DateTimeField(null=True, blank=True)
    receiver_signature = models.CharField(max_length=64, blank=True)
    reviewed_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handovers_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="handovers_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class TreasuryMovement(models.Model):
    """حركة سيولة — قبض / صرف / تحويل / إيداع / سحب."""

    class MovementType(models.TextChoices):
        RECEIPT = "receipt", "قبض"
        PAYMENT = "payment", "صرف"
        TRANSFER = "transfer", "تحويل"
        DEPOSIT = "deposit", "إيداع"
        WITHDRAWAL = "withdrawal", "سحب"

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        PENDING_APPROVAL = "pending_approval", "بانتظار الاعتماد"
        POSTED = "posted", "مرحّل"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    movement_date = models.DateField()
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    treasury = models.ForeignKey(Treasury, on_delete=models.PROTECT, related_name="movements")
    counter_treasury = models.ForeignKey(
        Treasury,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="counter_movements",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="EGP")
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treasury_movements",
    )
    cash_shift = models.ForeignKey(
        CashShift,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treasury_movements",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="treasury_movements_created",
    )
    approved_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treasury_movements_approved",
    )
    posted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-movement_date", "-created_at"]


class TreasuryAuditLog(models.Model):
    """سجل تدقيق كامل لحركات الصناديق والتسليم."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = models.CharField(max_length=40)
    entity_type = models.CharField(max_length=40)
    entity_id = models.UUIDField()
    entity_code = models.CharField(max_length=30, blank=True)
    user = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="treasury_audit_logs",
    )
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class GeneralExpenseVoucher(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        APPROVED = "approved", "معتمد"
        POSTED = "posted", "مرحّل"
        CANCELLED = "cancelled", "ملغى"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "نقدي"
        BANK = "bank", "تحويل بنكي"
        CHEQUE = "cheque", "شيك"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    voucher_date = models.DateField()
    expense_type = models.ForeignKey(
        GeneralExpenseType,
        on_delete=models.PROTECT,
        related_name="vouchers",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
    treasury = models.ForeignKey(Treasury, on_delete=models.PROTECT, related_name="expense_vouchers")
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_vouchers",
    )
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_vouchers",
    )
    beneficiary = models.CharField(max_length=300, blank=True)
    supplier = models.ForeignKey(
        "Supplier",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="general_expense_vouchers",
    )
    responsible = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_vouchers_responsible",
    )
    cash_shift = models.ForeignKey(
        CashShift,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_vouchers",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    requires_manager_review = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    journal_entry = models.OneToOneField(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_voucher",
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="expense_vouchers_created",
    )
    approved_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_vouchers_approved",
    )
    posted_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_vouchers_posted",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-voucher_date", "-created_at"]


class ExpenseVoucherAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voucher = models.ForeignKey(
        GeneralExpenseVoucher,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="expense_vouchers/%Y/%m/")
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class ShiftMovement(models.Model):
    class MovementType(models.TextChoices):
        SALE = "sale", "مبيعات"
        RETURN = "return", "مرتجعات"
        EXPENSE = "expense", "مصروفات"
        COLLECTION = "collection", "تحصيلات"
        TRANSFER_IN = "transfer_in", "تحويل وارد"
        TRANSFER_OUT = "transfer_out", "تحويل صادر"
        OPENING = "opening", "رصيد افتتاحي"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shift = models.ForeignKey(CashShift, on_delete=models.CASCADE, related_name="movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    reference = models.CharField(max_length=80, blank=True)
    expense_voucher = models.ForeignKey(
        GeneralExpenseVoucher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shift_movements",
    )
    notes = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
