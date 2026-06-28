"""هيكل الموظفين — إدارات، أقسام فرعية، شيفتات عمل."""

import uuid

from django.db import models

WEEKDAY_KEYS = (
    "saturday",
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
)


def default_weekly_schedule() -> list[dict]:
    return [
        {
            "day": day,
            "is_off": False,
            "start_time": "09:00",
            "end_time": "17:00",
        }
        for day in WEEKDAY_KEYS
    ]


class HrSection(models.Model):
    """قسم فرعي داخل الإدارة (مثل: قسم الاستلام تحت إدارة المخازن)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    department = models.ForeignKey(
        "Department",
        on_delete=models.PROTECT,
        related_name="hr_sections",
    )
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_sections_created",
    )
    updated_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_sections_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["department__code", "code"]
        constraints = [
            models.UniqueConstraint(
                fields=["department", "code"],
                name="erp_hrsection_dept_code_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.code} — {self.name}"


class WorkShift(models.Model):
    """شيفت عمل — مواعيد أسبوعية لكل يوم (حضور / تأخير / إضافي / غياب)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True, default="")
    description = models.TextField(blank=True)
    period_count = models.PositiveSmallIntegerField(default=1)
    weekly_schedule = models.JSONField(default=default_weekly_schedule)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_shifts_created",
    )
    updated_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_shifts_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class JobTitle(models.Model):
    """المسمى الوظيفي — كاشير، بائع، أمين مخزن…"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    job_level = models.CharField(max_length=10, default="B", help_text="المستوى الوظيفي: A, B, C…")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class EmployeeGroup(models.Model):
    """مجموعة موظفين — دوام كامل، نص شيفت، مندوبين."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, default="blue", help_text="لون التصنيف في الواجهة")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class EmployeeProfile(models.Model):
    """بيانات الموظف الوظيفية والمالية."""

    class CommissionMode(models.TextChoices):
        NONE = "none", "بدون عمولة"
        PERCENT = "percent", "نسبة مئوية"
        PER_THOUSAND = "per_thousand", "مبلغ لكل 1000 مبيعات"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "User",
        on_delete=models.CASCADE,
        related_name="employee_profile",
    )
    hire_date = models.DateField(null=True, blank=True)
    job_title = models.ForeignKey(
        JobTitle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    employee_group = models.ForeignKey(
        EmployeeGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    hire_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    basic_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    commission_mode = models.CharField(
        max_length=20,
        choices=CommissionMode.choices,
        default=CommissionMode.NONE,
    )
    commission_percent = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    commission_per_1000 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    photo = models.ImageField(upload_to="employees/photos/%Y/%m/", blank=True, null=True)
    id_card_file = models.FileField(upload_to="employees/id_cards/%Y/%m/", blank=True, null=True)
    id_card_filename = models.CharField(max_length=255, blank=True)
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__employee_code"]

    def __str__(self):
        return self.user.full_name or self.user.username


class EmployeeAllowance(models.Model):
    """بدلات الموظف (من ملف الموظف — نص حر أو بند بدل)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="pay_allowances",
    )
    allowance_item = models.ForeignKey(
        "AllowanceItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="legacy_allowances",
    )
    name = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]


class EmployeeSalaryIncrease(models.Model):
    """زيادات المرتب."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="salary_increases",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    effective_date = models.DateField()
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-effective_date"]
