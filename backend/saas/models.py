import uuid

from django.db import models
from django.utils import timezone


class Plan(models.Model):
    class Meta:
        ordering = ["name"]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=120)
    max_branches = models.PositiveIntegerField(default=1)
    max_users = models.PositiveIntegerField(default=3)
    max_concurrent_users = models.PositiveIntegerField(default=2)
    price_monthly = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Tenant(models.Model):
    class Status(models.TextChoices):
        PROVISIONING = "provisioning", "Provisioning"
        ACTIVE = "active", "Active"
        FROZEN = "frozen", "Frozen"
        SUSPENDED = "suspended", "Suspended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=63, unique=True)
    db_name = models.CharField(max_length=63, unique=True, editable=False)
    db_user = models.CharField(
        max_length=63,
        blank=True,
        editable=False,
        db_index=True,
        verbose_name="يوزر قاعدة البيانات",
        help_text="دور PostgreSQL الخاص بهذه المنشأة (منفصل عن MainClothes)",
    )
    db_password_encrypted = models.TextField(
        blank=True,
        editable=False,
        help_text="كلمة مرور دور PostgreSQL (مشفّرة)",
    )
    db_initial_password = models.CharField(
        max_length=128,
        blank=True,
        verbose_name="باسورد قاعدة البيانات",
        help_text="كلمة مرور قاعدة البيانات — تُحفظ عند الإنشاء للمرجع في الأدمن",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PROVISIONING
    )
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="tenants")
    modules = models.JSONField(
        default=list,
        blank=True,
        verbose_name="الموديولات المفعّلة",
        help_text="الموديولات التي يرىها المستخدمون في النظام",
    )
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    owner_username = models.CharField(
        max_length=150,
        blank=True,
        help_text="اسم مستخدم المالك في ERP (للمرجع من السوبر أدمن)",
    )
    owner_initial_password = models.CharField(
        max_length=128,
        blank=True,
        help_text="كلمة المرور الأخيرة المعروفة — تُحفظ عند الإنشاء أو إعادة التعيين فقط",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.slug})"

    def save(self, *args, **kwargs):
        if not self.db_name:
            from django.conf import settings

            self.db_name = f"{settings.TENANT_DB_PREFIX}{self.slug}"
        super().save(*args, **kwargs)

    @property
    def is_operational(self):
        return self.status == self.Status.ACTIVE

    def set_db_password(self, raw_password: str) -> None:
        from tenancy.db_crypto import encrypt_db_password

        self.db_password_encrypted = encrypt_db_password(raw_password)

    def get_db_password(self) -> str:
        if not self.db_password_encrypted:
            return ""
        from tenancy.db_crypto import decrypt_db_password

        return decrypt_db_password(self.db_password_encrypted)

    def ensure_db_credentials(self, *, save: bool = False) -> tuple[str, str]:
        """يولّد ويحفظ دور PostgreSQL وباسورد إن لم يكونا موجودين."""
        if self.db_user and self.db_password_encrypted:
            return self.db_user, self.get_db_password()

        from tenancy.db import generate_tenant_db_credentials

        user, password = generate_tenant_db_credentials(self)
        self.db_user = user
        self.set_db_password(password)
        self.db_initial_password = password
        if save:
            self.save(
                update_fields=[
                    "db_user",
                    "db_password_encrypted",
                    "db_initial_password",
                    "updated_at",
                ]
            )
        return user, password

    def apply_db_credentials(self, db_user: str, db_password: str) -> None:
        """يحفظ بيانات PostgreSQL المُدخلة يدوياً من الأدمن."""
        self.db_user = db_user.strip().lower()
        self.set_db_password(db_password)
        self.db_initial_password = db_password

    @property
    def has_dedicated_db_credentials(self) -> bool:
        return bool(self.db_user and self.db_password_encrypted)


class Subscription(models.Model):
    class Meta:
        ordering = ["-starts_at"]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)
    starts_at = models.DateField(default=timezone.localdate)
    ends_at = models.DateField()
    grace_days = models.PositiveIntegerField(default=10)
    is_current = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tenant.slug} → {self.plan.code}"

    @property
    def last_allowed_date(self):
        from datetime import timedelta

        return self.ends_at + timedelta(days=self.grace_days)

    def is_expired(self, on_date=None) -> bool:
        from django.utils import timezone

        today = on_date or timezone.localdate()
        return today > self.last_allowed_date


class GlobalUsername(models.Model):
    """اسم مستخدم فريد عالمياً عبر كل المنشآت (من PDF)."""

    username = models.CharField(max_length=150, unique=True, db_index=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="usernames")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username


class PaymentRecord(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "نقدي"
        FAWRY = "fawry", "فوري"
        PAYMOB = "paymob", "Paymob"
        INSTAPAY = "instapay", "إنستاباي"
        CARD = "card", "بطاقة"
        OTHER = "other", "أخرى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name="المنشأة",
    )
    renewal_months = models.PositiveIntegerField(
        default=1,
        verbose_name="عدد شهور التجديد",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="المبلغ")
    method = models.CharField(
        max_length=20,
        choices=Method.choices,
        default=Method.CASH,
        verbose_name="طريقة الدفع",
    )
    reference = models.CharField(max_length=120, blank=True, verbose_name="مرجع / رقم عملية")
    paid_at = models.DateTimeField(default=timezone.now, verbose_name="تاريخ الدفع")
    notes = models.TextField(blank=True, verbose_name="ملاحظات")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_at"]
        verbose_name = "دفعة اشتراك"
        verbose_name_plural = "مدفوعات الاشتراكات"

    def __str__(self):
        return f"{self.tenant.slug} — {self.amount}"
