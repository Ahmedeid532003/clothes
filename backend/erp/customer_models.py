"""العملاء — أنواع ديناميكية، مجموعات هرمية، بيانات العميل."""

import uuid
from decimal import Decimal

from django.db import models


class CustomerType(models.Model):
    """نوع العميل — يحدد الفورم والحقول الإلزامية وWorkflow."""

    class Slug(models.TextChoices):
        ESTABLISHMENT = "establishment", "منشأة"
        SHOP = "shop", "محل"
        INDIVIDUAL = "individual", "فرد"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    slug = models.CharField(max_length=30, choices=Slug.choices, default=Slug.INDIVIDUAL)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    # قائمة مفاتيح الحقول الإلزامية (من form_schema)
    mandatory_fields = models.JSONField(default=list, blank=True)
    # صلاحيات رؤية: { "owner": ["*"], "sales": ["field1", ...], ... }
    field_visibility = models.JSONField(default=dict, blank=True)
    # خطوات سير العمل: [{ "key": "draft", "label_ar": "...", "label_en": "..." }, ...]
    workflow_steps = models.JSONField(default=list, blank=True)
    # تعريف الحقول الديناميكية للفورم
    form_schema = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "نوع عميل"
        verbose_name_plural = "أنواع العملاء"

    def __str__(self):
        return self.name_ar


class CustomerGroup(models.Model):
    """مجموعة عملاء — شجرة مع سياسات افتراضية."""

    class PaymentPolicy(models.TextChoices):
        CASH = "cash", "نقدي"
        CREDIT_7 = "credit_7", "آجل 7 أيام"
        CREDIT_15 = "credit_15", "آجل 15 يوم"
        CREDIT_30 = "credit_30", "آجل 30 يوم"
        CREDIT_60 = "credit_60", "آجل 60 يوم"
        INSTALLMENT = "installment", "أقساط"

    class RiskLevel(models.TextChoices):
        LOW = "low", "منخفض"
        MEDIUM = "medium", "متوسط"
        HIGH = "high", "مرتفع"
        BLOCKED = "blocked", "محظور"

    class VolumeTier(models.TextChoices):
        SMALL = "small", "صغير"
        MEDIUM = "medium", "متوسط"
        LARGE = "large", "كبير"
        KEY = "key", "استراتيجي"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=40, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    level = models.PositiveSmallIntegerField(default=0)
    tree_path = models.CharField(max_length=500, blank=True, db_index=True)
    path_label = models.CharField(max_length=500, blank=True)
    default_discount_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0")
    )
    default_payment_policy = models.CharField(
        max_length=30,
        choices=PaymentPolicy.choices,
        default=PaymentPolicy.CASH,
    )
    default_credit_limit = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    region = models.CharField(max_length=120, blank=True, help_text="تصنيف المنطقة")
    salesperson = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_groups_assigned",
    )
    risk_level = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
        default=RiskLevel.MEDIUM,
    )
    volume_tier = models.CharField(
        max_length=20,
        choices=VolumeTier.choices,
        default=VolumeTier.MEDIUM,
    )
    notes = models.TextField(blank=True)
    display_color = models.CharField(
        max_length=7,
        default="#4F46E5",
        help_text="لون عرض المجموعة في جداول العملاء",
    )
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["tree_path", "code"]
        verbose_name = "مجموعة عملاء"
        verbose_name_plural = "مجموعات العملاء"

    def __str__(self):
        return self.name_ar


class Customer(models.Model):
    """عميل — بيانات أساسية + profile_data ديناميكي حسب النوع."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    customer_type = models.ForeignKey(
        CustomerType,
        on_delete=models.PROTECT,
        related_name="customers",
    )
    customer_group = models.ForeignKey(
        CustomerGroup,
        on_delete=models.PROTECT,
        related_name="customers",
    )
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    whatsapp = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    workflow_status = models.CharField(max_length=40, default="draft")
    profile_data = models.JSONField(default=dict, blank=True)
    credit_limit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    payment_policy = models.CharField(max_length=30, blank=True)
    balance_due = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_sales = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_collected = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    last_activity_at = models.DateTimeField(null=True, blank=True)
    assigned_salesperson = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers_assigned",
    )
    national_id = models.CharField(max_length=14, blank=True, db_index=True)
    governorate = models.CharField(max_length=80, blank=True)
    city = models.CharField(max_length=80, blank=True)
    district = models.CharField(max_length=80, blank=True)
    gps_lat = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    gps_lng = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    barcode = models.CharField(max_length=40, blank=True)
    credit_score = models.PositiveSmallIntegerField(default=0)
    purchase_count = models.PositiveIntegerField(default=0)
    avg_purchase_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    is_stopped = models.BooleanField(default=False)
    stop_reason = models.CharField(max_length=300, blank=True)
    uses_consignment = models.BooleanField(default=False)
    route_line = models.CharField(max_length=120, blank=True)
    customer_rating = models.PositiveSmallIntegerField(default=0)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="customers_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "عميل"
        verbose_name_plural = "العملاء"

    def __str__(self):
        return self.name_ar


class CustomerActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="activity_logs"
    )
    action = models.CharField(max_length=40)
    summary = models.CharField(max_length=500)
    user = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, related_name="customer_activities"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class CustomerAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="attachments"
    )
    kind = models.CharField(max_length=40, blank=True)
    file = models.FileField(upload_to="customers/%Y/%m/")
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
