"""البنوك — حسابات بنكية — شيكات."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone


class Bank(models.Model):
    """قائمة البنوك (الأهلى، مصر، CIB…)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "بنك"
        verbose_name_plural = "البنوك"

    def __str__(self):
        return self.name_ar


class BankAccount(models.Model):
    """حساب بنكي فعلي للشركة."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    bank = models.ForeignKey(Bank, on_delete=models.PROTECT, related_name="accounts")
    account_number = models.CharField(max_length=64)
    opening_balance = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    gl_account = models.ForeignKey(
        "GlAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bank_accounts",
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "حساب بنكي"
        verbose_name_plural = "حسابات البنوك"

    def __str__(self):
        return f"{self.code} — {self.name_ar}"


class BankAccountMovement(models.Model):
    """حركة على حساب بنكي — إيداع / سحب / تحويل / دفع."""

    class MovementType(models.TextChoices):
        DEPOSIT = "deposit", "إيداع"
        WITHDRAWAL = "withdrawal", "سحب"
        TRANSFER_IN = "transfer_in", "تحويل وارد"
        TRANSFER_OUT = "transfer_out", "تحويل صادر"
        PAYMENT = "payment", "دفع"

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        POSTED = "posted", "مرحّل"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    bank_account = models.ForeignKey(
        BankAccount, on_delete=models.PROTECT, related_name="movements"
    )
    counter_account = models.ForeignKey(
        BankAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="counter_movements",
    )
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    movement_date = models.DateField(default=timezone.localdate)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    cheque = models.ForeignKey(
        "Cheque",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movements",
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="bank_movements_created",
    )
    posted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-movement_date", "-created_at"]
        verbose_name = "حركة حساب بنكي"
        verbose_name_plural = "حركات الحسابات البنكية"

    def __str__(self):
        return self.code


class Cheque(models.Model):
    """شيك / كمبيالة / ورقة دفع — صادر أو وارد."""

    class Direction(models.TextChoices):
        PAYABLE = "payable", "شيك صادر (دفع)"
        RECEIVABLE = "receivable", "شيك وارد (تحصيل)"

    class PaperType(models.TextChoices):
        CHEQUE = "cheque", "شيك"
        PROMISSORY_NOTE = "promissory_note", "كمبيالة"
        BILL_OF_EXCHANGE = "bill_of_exchange", "كمبيالة تجارية"
        OTHER_PAPER = "other_paper", "ورقة دفع أخرى"

    class Status(models.TextChoices):
        PENDING = "pending", "قيد الانتظار"
        DELIVERED = "delivered", "تم التسليم"
        PAID = "paid", "تم الصرف"
        CANCELLED = "cancelled", "ملغاة"
        RETURNED = "returned", "مرتجعة"
        REJECTED = "rejected", "مرفوض"  # legacy — يُعامل كمرتجعة

    class PaySource(models.TextChoices):
        CASH = "cash", "نقداً من المنشأة"
        BANK = "bank", "من حساب بنكي"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    paper_type = models.CharField(
        max_length=30,
        choices=PaperType.choices,
        default=PaperType.CHEQUE,
    )
    direction = models.CharField(max_length=20, choices=Direction.choices)
    cheque_number = models.CharField(max_length=64, db_index=True)
    bank_account = models.ForeignKey(
        BankAccount, on_delete=models.PROTECT, related_name="cheques"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    due_date = models.DateField()
    delivery_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    party_name = models.CharField(
        max_length=300,
        blank=True,
        help_text="المستفيد أو الدافع",
    )
    notes = models.TextField(blank=True)
    alert_sent = models.BooleanField(default=False)
    pay_source = models.CharField(
        max_length=20,
        choices=PaySource.choices,
        blank=True,
        default="",
    )
    pay_bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cheques_paid_from",
    )
    pay_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    pay_date = models.DateField(null=True, blank=True)
    pay_notes = models.TextField(blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    supplier_payment = models.OneToOneField(
        "SupplierPayment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_paper",
    )
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="cheques_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "-created_at"]
        verbose_name = "شيك"
        verbose_name_plural = "الشيكات"

    def __str__(self):
        return f"{self.cheque_number} — {self.amount}"


class CardNetwork(models.Model):
    """شبكة بطاقات (Visa، MasterCard…)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "شبكة بطاقات"
        verbose_name_plural = "شبكات البطاقات"

    def __str__(self):
        return self.name_ar


class CardMerchantAccount(models.Model):
    """حساب تاجر للبطاقات — مرتبط ببنك التسوية."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    card_network = models.ForeignKey(
        CardNetwork, on_delete=models.PROTECT, related_name="merchant_accounts"
    )
    bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.PROTECT,
        related_name="card_merchant_accounts",
        help_text="حساب البنك الذي تُسوّى عليه العمليات",
    )
    opening_balance = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "حساب فيزا / بطاقات"
        verbose_name_plural = "حسابات الفيزا"

    def __str__(self):
        return f"{self.code} — {self.name_ar}"


class CardTransaction(models.Model):
    """عملية دفع بالبطاقة — معلقة حتى التسوية البنكية."""

    class PartyType(models.TextChoices):
        CUSTOMER = "customer", "عميل"
        SUPPLIER = "supplier", "مورد"
        OTHER = "other", "أخرى"

    class Status(models.TextChoices):
        PENDING = "pending", "معلق (لم يُسوّى)"
        SETTLED = "settled", "مُسوّى"
        REJECTED = "rejected", "مرفوض"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    transaction_number = models.CharField(max_length=64, db_index=True)
    card_merchant_account = models.ForeignKey(
        CardMerchantAccount, on_delete=models.PROTECT, related_name="transactions"
    )
    bank_account = models.ForeignKey(
        BankAccount, on_delete=models.PROTECT, related_name="card_transactions"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    transaction_date = models.DateField(default=timezone.localdate)
    party_type = models.CharField(
        max_length=20, choices=PartyType.choices, default=PartyType.OTHER
    )
    customer = models.ForeignKey(
        "Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="card_transactions",
    )
    supplier = models.ForeignKey(
        "Supplier",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="card_transactions",
    )
    party_name = models.CharField(max_length=300, blank=True)
    sale = models.ForeignKey(
        "Sale",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="card_transactions",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    settlement_movement = models.ForeignKey(
        BankAccountMovement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="card_settlements",
    )
    settled_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="card_transactions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transaction_date", "-created_at"]
        verbose_name = "عملية بطاقة"
        verbose_name_plural = "عمليات البطاقات"

    def __str__(self):
        return f"{self.transaction_number} — {self.amount}"


class EWalletProvider(models.Model):
    """مزود محفظة (فودافون كاش، أورنج، InstaPay…)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "مزود محفظة"
        verbose_name_plural = "مزودو المحافظ"

    def __str__(self):
        return self.name_ar


class EWalletAccount(models.Model):
    """محفظة إلكترونية للشركة."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    provider = models.ForeignKey(
        EWalletProvider, on_delete=models.PROTECT, related_name="accounts"
    )
    wallet_number = models.CharField(max_length=64, blank=True)
    bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_wallets",
        help_text="البنك المرتبط للتحويلات",
    )
    opening_balance = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "محفظة إلكترونية"
        verbose_name_plural = "المحافظ الإلكترونية"

    def __str__(self):
        return f"{self.code} — {self.name_ar}"


class EWalletMovement(models.Model):
    """حركة على محفظة — إيداع / سحب / تحويل."""

    class MovementType(models.TextChoices):
        DEPOSIT = "deposit", "إيداع"
        WITHDRAWAL = "withdrawal", "سحب"
        TRANSFER_IN = "transfer_in", "تحويل وارد"
        TRANSFER_OUT = "transfer_out", "تحويل صادر"

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        POSTED = "posted", "مرحّل"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    e_wallet_account = models.ForeignKey(
        EWalletAccount, on_delete=models.PROTECT, related_name="movements"
    )
    counter_wallet = models.ForeignKey(
        EWalletAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="counter_movements",
    )
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    movement_date = models.DateField(default=timezone.localdate)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    sale = models.ForeignKey(
        "Sale",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wallet_movements",
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="wallet_movements_created",
    )
    posted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-movement_date", "-created_at"]
        verbose_name = "حركة محفظة"
        verbose_name_plural = "حركات المحافظ"

    def __str__(self):
        return self.code


class ChannelTransfer(models.Model):
    """تحويل داخلي بين بنك ومحفظة (أو بين حسابات)."""

    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        POSTED = "posted", "مرحّل"
        CANCELLED = "cancelled", "ملغى"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    from_bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="transfers_out_channel",
    )
    from_wallet = models.ForeignKey(
        EWalletAccount,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="transfers_out_channel",
    )
    to_bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="transfers_in_channel",
    )
    to_wallet = models.ForeignKey(
        EWalletAccount,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="transfers_in_channel",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    transfer_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="channel_transfers_created",
    )
    posted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transfer_date", "-created_at"]
        verbose_name = "تحويل بين قنوات الدفع"
        verbose_name_plural = "تحويلات قنوات الدفع"

    def __str__(self):
        return self.code
