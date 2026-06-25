import uuid
from decimal import Decimal

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra):
        if not username:
            raise ValueError("Username required")
        user = self.model(username=username.lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra):
        extra.setdefault("is_staff", True)
        return self.create_user(username, password, **extra)


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    manager_name = models.CharField(max_length=200, blank=True)
    operational_budget = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="departments_created",
    )
    updated_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="departments_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class User(AbstractBaseUser):
    class BranchAccessMode(models.TextChoices):
        SINGLE = "single", "Single branch"
        MULTIPLE = "multiple", "Multiple branches"
        ALL = "all", "All branches"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    employee_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    avatar = models.ImageField(upload_to="users/avatars/%Y/%m/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # دعم فني فقط
    is_owner = models.BooleanField(default=False)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        verbose_name="الإدارة",
    )
    hr_section = models.ForeignKey(
        "HrSection",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        verbose_name="القسم",
    )
    work_shift = models.ForeignKey(
        "WorkShift",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        verbose_name="الشيفت",
    )
    permissions = models.JSONField(default=dict, blank=True)
    branch_access_mode = models.CharField(
        max_length=20,
        choices=BranchAccessMode.choices,
        default=BranchAccessMode.ALL,
    )
    allowed_branches = models.ManyToManyField(
        "Branch",
        blank=True,
        related_name="allowed_users",
    )
    default_branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="default_users",
    )
    created_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users_created",
    )
    updated_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ["username"]

    def __str__(self):
        return self.username


class Branch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.SlugField(max_length=50, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    image = models.ImageField(upload_to="branches/%Y/%m/", blank=True, null=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return self.name_ar or self.code


class Warehouse(models.Model):
    """مخزن تخزين فقط — لا يظهر في شاشات البيع/الشراء (PDF)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.SlugField(max_length=50, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    manager_name = models.CharField(max_length=200, blank=True, verbose_name="مسؤول المخزن")
    primary_branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="primary_warehouses",
        verbose_name="الفرع التابع",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "مخزن"
        verbose_name_plural = "المخازن"

    def __str__(self):
        return self.name_ar or self.code


class BranchWarehouse(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="warehouse_links")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="branch_links")
    is_default = models.BooleanField(default=False)

    class Meta:
        unique_together = [("branch", "warehouse")]


class InventorySettings(models.Model):
    """إعدادات مخزون المنشأة (صف واحد)."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    default_reorder_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0"),
        help_text="نسبة حد الطلب الافتراضية لكل الأصناف",
    )
    transfer_requires_approval = models.BooleanField(
        default=True,
        help_text="إذون التحويل تحتاج اعتماد مدير افتراضياً",
    )
    pos_force_return_from_invoice = models.BooleanField(
        default=True,
        help_text="إجبار المرتجع من فاتورة بيع أصلية في تبويب التبديل",
    )
    pos_require_seller_on_scan = models.BooleanField(
        default=True,
        help_text="طلب رقم البائع بعد مسح الباركود في نقطة البيع",
    )
    class PosCommissionBasis(models.TextChoices):
        SELLER = "seller", "البائع"
        PRODUCT = "product", "الصنف"

    pos_commission_basis = models.CharField(
        max_length=20,
        choices=PosCommissionBasis.choices,
        default=PosCommissionBasis.SELLER,
        help_text="أساس حساب عمولة البيع في نقطة البيع",
    )
    pos_allow_multiple_sellers = models.BooleanField(
        default=True,
        help_text="السماح بعدة بائعين في فاتورة نقطة البيع الواحدة",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "إعدادات المخزون"
        verbose_name_plural = "إعدادات المخزون"


class Season(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.SlugField(max_length=50, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    is_open = models.BooleanField(default=True)
    is_current = models.BooleanField(default=False)
    starts_at = models.DateField(null=True, blank=True)
    ends_at = models.DateField(null=True, blank=True)
    barcode_prefix = models.CharField(
        max_length=20,
        blank=True,
        help_text="بادئة الباركود للموسم (فارغ = كود الموسم)",
    )
    barcode_next_number = models.PositiveIntegerField(
        default=100000,
        help_text="الرقم التالي للباركود التلقائي",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name_ar or self.code


from erp.catalog_models import (  # noqa: E402, F401
    Brand,
    ProductClassification,
    ProductColor,
    ProductSection,
    ProductSize,
)
from erp.product_models import (  # noqa: E402, F401
    BranchOfferPrice,
    CompositeProduct,
    CompositeProductLine,
    OkazionNoticeLine,
    PriceAdjustment,
    Product,
    ProductVariant,
    StockBalance,
    StockCount,
    StockCountLine,
    StockScrap,
    StockScrapLine,
    StockDisbursement,
    StockDisbursementLine,
    StockAddition,
    StockAdditionLine,
    StockTransfer,
    StockTransferLine,
    StoreOfferNoticeLine,
)
from erp.scan_order_models import ScanOrder, ScanOrderLine  # noqa: E402, F401
from erp.purchase_models import PurchaseInvoice, PurchaseInvoiceLine  # noqa: E402, F401
from erp.purchase_order_models import PurchaseOrder, PurchaseOrderLine  # noqa: E402, F401
from erp.sale_models import (  # noqa: E402, F401
    Sale,
    SaleLine,
    SalePayment,
    SaleReturn,
    SaleReturnLine,
    SalesQuotation,
    SalesQuotationLine,
    CustomerReservation,
    CustomerReservationLine,
)
from erp.hr_structure_models import (  # noqa: E402, F401
    EmployeeAllowance,
    EmployeeGroup,
    EmployeeProfile,
    EmployeeSalaryIncrease,
    HrSection,
    JobTitle,
    WorkShift,
)
from erp.hr_payroll_models import (  # noqa: E402, F401
    AllowanceItem,
    AttendanceImportBatch,
    AttendanceRecord,
    BonusItem,
    DeductionItem,
    EmployeeAdvance,
    EmployeeAdvanceInstallment,
    EmployeeAllowanceAssignment,
    EmployeeBonus,
    EmployeeCommissionRecord,
    EmployeeDeduction,
    EmployeeLeave,
    LeaveType,
    OfficialHoliday,
    PayrollPayment,
    PayrollPaymentType,
    PayrollPeriodLock,
    PayrollStatement,
)
from erp.customer_models import (  # noqa: E402, F401
    Customer,
    CustomerActivityLog,
    CustomerAttachment,
    CustomerGroup,
    CustomerType,
)
from erp.consignment_models import (  # noqa: E402, F401
    ConsignmentActivityLog,
    ConsignmentAuditLog,
    ConsignmentBalance,
    ConsignmentMovement,
    ConsignmentMovementLine,
)
from erp.receivable_models import (  # noqa: E402, F401
    CustomerFollowUp,
    CustomerReminder,
    InstallmentContract,
    InstallmentFollowUpSavedList,
    InstallmentLine,
    InstallmentPlanTemplate,
    ReceivableInvoice,
    ReceivablePayment,
)
from erp.supplier_models import (  # noqa: E402, F401
    Supplier,
    SupplierAccountEntry,
    SupplierCategory,
    SupplierDepartment,
    SupplierGroup,
    SupplierPayment,
    SupplierType,
    SupplierWeeklyInventoryReport,
)
from erp.banking_models import (  # noqa: E402, F401
    Bank,
    BankAccount,
    BankAccountMovement,
    CardMerchantAccount,
    CardNetwork,
    CardTransaction,
    ChannelTransfer,
    Cheque,
    EWalletAccount,
    EWalletMovement,
    EWalletProvider,
)
from erp.accounting_models import (  # noqa: E402, F401
    AccountingSettings,
    CashShift,
    CostCenter,
    Currency,
    DepreciationEntry,
    ExpenseVoucherAttachment,
    FixedAsset,
    GeneralExpenseType,
    GeneralExpenseVoucher,
    GlAccount,
    JournalEntry,
    JournalLine,
    ShiftHandover,
    ShiftMovement,
    Treasury,
    TreasuryAuditLog,
    TreasuryMovement,
)
