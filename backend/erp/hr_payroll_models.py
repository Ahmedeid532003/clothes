"""الرواتب والحضور — مكافآت، خصومات، بدلات، إجازات، حضور، عمولات، صرف."""

import uuid

from django.db import models


class BonusItem(models.Model):
    """بند مكافأة — تحقيق تارجت، انتظام…"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class DeductionItem(models.Model):
    """بند خصم — غياب، تأخير، تلفيات…"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    default_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class AllowanceItem(models.Model):
    """بند بدل — مواصلات، وجبة، سكن…"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    default_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class LeaveType(models.Model):
    """نوع إجازة — مرضى، اعتيادية، عارضة…"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class OfficialHoliday(models.Model):
    """إجازة رسمية — عيد، 6 أكتوبر…"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    holiday_date = models.DateField()
    is_recurring = models.BooleanField(
        default=False,
        help_text="يتكرر سنوياً في نفس اليوم/الشهر",
    )
    notes = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-holiday_date"]

    def __str__(self):
        return f"{self.name} ({self.holiday_date})"


class PayrollPaymentType(models.Model):
    """نوع إذن دفع — مرتب، سلفة، منحة…"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class EmployeeBonus(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey("User", on_delete=models.CASCADE, related_name="hr_bonuses")
    bonus_item = models.ForeignKey(
        BonusItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entries",
    )
    description = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    bonus_date = models.DateField()
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-bonus_date"]


class EmployeeDeduction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey("User", on_delete=models.CASCADE, related_name="hr_deductions")
    deduction_item = models.ForeignKey(
        DeductionItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entries",
    )
    description = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    deduction_date = models.DateField()
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-deduction_date"]


class EmployeeAllowanceAssignment(models.Model):
    """بدل فعلي للموظف — مرتبط ببند بدل."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="allowance_assignments",
    )
    allowance_item = models.ForeignKey(
        AllowanceItem,
        on_delete=models.PROTECT,
        related_name="assignments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["allowance_item__code"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "allowance_item"],
                name="erp_emp_allowance_item_uniq",
            ),
        ]


class EmployeeLeave(models.Model):
    class Unit(models.TextChoices):
        DAYS = "days", "أيام"
        HOURS = "hours", "ساعات"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey("User", on_delete=models.CASCADE, related_name="hr_leaves")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, related_name="leaves")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.DAYS)
    quantity = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]


class AttendanceRecord(models.Model):
    class Source(models.TextChoices):
        MANUAL = "manual", "يدوي"
        FINGERPRINT = "fingerprint", "بصمة"
        IMPORT = "import", "استيراد"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey("User", on_delete=models.CASCADE, related_name="attendance_records")
    work_date = models.DateField()
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    late_minutes = models.PositiveIntegerField(default=0)
    overtime_minutes = models.PositiveIntegerField(default=0)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-work_date", "employee__employee_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "work_date"],
                name="erp_attendance_emp_date_uniq",
            ),
        ]


class AttendanceImportBatch(models.Model):
    """دفعة استيراد من جهاز البصمة."""

    class Status(models.TextChoices):
        PENDING = "pending", "قيد المعالجة"
        DONE = "done", "تم"
        FAILED = "failed", "فشل"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file_name = models.CharField(max_length=255, blank=True)
    records_count = models.PositiveIntegerField(default=0)
    imported_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    error_message = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_imports",
    )
    created_at = models.DateTimeField(auto_now_add=True)


class EmployeeCommissionRecord(models.Model):
    class PeriodType(models.TextChoices):
        DAILY = "daily", "يومي"
        MONTHLY = "monthly", "شهري"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="commission_records",
    )
    period_type = models.CharField(max_length=10, choices=PeriodType.choices, default=PeriodType.MONTHLY)
    period_date = models.DateField()
    sales_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-period_date"]


class EmployeeAdvance(models.Model):
    """سلفة على الموظف — تُخصم من كشف الراتب."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey("User", on_delete=models.CASCADE, related_name="hr_advances")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    advance_date = models.DateField()
    settled_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.CharField(max_length=255, blank=True)
    is_scheduled = models.BooleanField(default=False, help_text="سلفة مجدولة بأقساط شهرية")
    installment_months = models.PositiveSmallIntegerField(null=True, blank=True)
    monthly_installment = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_advances",
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="advances_created",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-advance_date"]

    @property
    def balance(self):
        return self.amount - self.settled_amount


class EmployeeAdvanceInstallment(models.Model):
    """قسط شهري لسداد سلفة مجدولة — يظهر في كشف الرواتب كـ سداد سلفة مرحلة."""

    class Status(models.TextChoices):
        PENDING = "pending", "معلق"
        DEDUCTED = "deducted", "مخصوم"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    advance = models.ForeignKey(
        EmployeeAdvance,
        on_delete=models.CASCADE,
        related_name="installments",
    )
    period_year = models.PositiveSmallIntegerField()
    period_month = models.PositiveSmallIntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["period_year", "period_month"]
        constraints = [
            models.UniqueConstraint(
                fields=["advance", "period_year", "period_month"],
                name="erp_advance_installment_period_uniq",
            ),
        ]


class PayrollPeriodLock(models.Model):
    """إقفال شهر صرف — يمنع تسجيل أو تعديل حركات على شهر مغلق."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    period_year = models.PositiveSmallIntegerField()
    period_month = models.PositiveSmallIntegerField()
    closed_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_periods_closed",
    )
    closed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["period_year", "period_month"],
                name="erp_payroll_period_lock_uniq",
            ),
        ]


class PayrollPayment(models.Model):
    """إذن صرف — راتب / سلفة / منحة."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey("User", on_delete=models.CASCADE, related_name="payroll_payments")
    payment_type = models.ForeignKey(
        PayrollPaymentType,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    period_year = models.PositiveSmallIntegerField(null=True, blank=True)
    period_month = models.PositiveSmallIntegerField(null=True, blank=True)
    advance = models.ForeignKey(
        EmployeeAdvance,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="settlements",
    )
    notes = models.CharField(max_length=255, blank=True)
    grant_reason = models.CharField(max_length=255, blank=True, help_text="سبب المنحة / المكافأة")
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_payments",
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_payments_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_payments_updated",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-payment_date"]


class PayrollStatement(models.Model):
    """كشف رواتب معتمد — شهر + سنة + فرع."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        APPROVED = "approved", "معتمد"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    period_year = models.PositiveSmallIntegerField()
    period_month = models.PositiveSmallIntegerField()
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.PROTECT,
        related_name="payroll_statements",
    )
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.APPROVED,
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_statements_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["period_year", "period_month", "branch"],
                name="erp_payroll_statement_period_branch_uniq",
            ),
        ]
