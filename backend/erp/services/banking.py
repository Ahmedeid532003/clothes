"""خدمات البنوك وحسابات البنوك والشيكات."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.banking_models import Bank, BankAccount, BankAccountMovement, Cheque
from erp.services import catalog as catalog_service

_USING = "tenant"
_INFLOW = (
    BankAccountMovement.MovementType.DEPOSIT,
    BankAccountMovement.MovementType.TRANSFER_IN,
)
_OUTFLOW = (
    BankAccountMovement.MovementType.WITHDRAWAL,
    BankAccountMovement.MovementType.TRANSFER_OUT,
    BankAccountMovement.MovementType.PAYMENT,
)


def _account_balance(account_id) -> Decimal:
    account = BankAccount.objects.using(_USING).get(pk=account_id)
    total = account.opening_balance or Decimal("0")
    posted = BankAccountMovement.objects.using(_USING).filter(
        status=BankAccountMovement.Status.POSTED
    )
    for m in posted.filter(bank_account_id=account_id):
        if m.movement_type in _INFLOW:
            total += m.amount
        else:
            total -= m.amount
    for m in posted.filter(
        counter_account_id=account_id,
        movement_type=BankAccountMovement.MovementType.TRANSFER_OUT,
    ):
        total += m.amount
    return total.quantize(Decimal("0.01"))


def _serialize_bank(b: Bank) -> dict:
    return {
        "id": str(b.pk),
        "code": b.code,
        "name_ar": b.name_ar,
        "name_en": b.name_en,
        "is_active": b.is_active,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


def _serialize_account(a: BankAccount, *, balance: Decimal | None = None) -> dict:
    bal = balance if balance is not None else _account_balance(a.pk)
    return {
        "id": str(a.pk),
        "code": a.code,
        "name_ar": a.name_ar,
        "name_en": a.name_en,
        "bank": str(a.bank_id),
        "bank_name": a.bank.name_ar,
        "account_number": a.account_number,
        "opening_balance": str(a.opening_balance),
        "current_balance": str(bal),
        "gl_account": str(a.gl_account_id) if a.gl_account_id else None,
        "notes": a.notes,
        "is_active": a.is_active,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _serialize_movement(m: BankAccountMovement) -> dict:
    return {
        "id": str(m.pk),
        "code": m.code,
        "bank_account": str(m.bank_account_id),
        "bank_account_name": m.bank_account.name_ar if m.bank_account else "",
        "counter_account": str(m.counter_account_id) if m.counter_account_id else None,
        "counter_account_name": (
            m.counter_account.name_ar if m.counter_account else None
        ),
        "movement_type": m.movement_type,
        "movement_date": m.movement_date.isoformat(),
        "amount": str(m.amount),
        "status": m.status,
        "notes": m.notes,
        "cheque": str(m.cheque_id) if m.cheque_id else None,
        "created_by_name": (
            (m.created_by.full_name or m.created_by.username) if m.created_by else None
        ),
        "posted_at": m.posted_at.isoformat() if m.posted_at else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _normalize_cheque_status(status: str) -> str:
    if status == Cheque.Status.REJECTED:
        return Cheque.Status.RETURNED
    return status


def _serialize_cheque(c: Cheque) -> dict:
    status = _normalize_cheque_status(c.status)
    created_by = c.created_by
    return {
        "id": str(c.pk),
        "code": c.code,
        "paper_type": c.paper_type,
        "direction": c.direction,
        "cheque_number": c.cheque_number,
        "bank_account": str(c.bank_account_id),
        "bank_account_name": c.bank_account.name_ar if c.bank_account else "",
        "bank_name": c.bank_account.bank.name_ar if c.bank_account else "",
        "amount": str(c.amount),
        "due_date": c.due_date.isoformat(),
        "delivery_date": c.delivery_date.isoformat() if c.delivery_date else None,
        "status": status,
        "party_name": c.party_name,
        "notes": c.notes,
        "alert_sent": c.alert_sent,
        "pay_source": c.pay_source or None,
        "pay_bank_account": str(c.pay_bank_account_id) if c.pay_bank_account_id else None,
        "pay_bank_account_name": c.pay_bank_account.name_ar if c.pay_bank_account else "",
        "pay_amount": str(c.pay_amount) if c.pay_amount is not None else None,
        "pay_date": c.pay_date.isoformat() if c.pay_date else None,
        "pay_notes": c.pay_notes or "",
        "paid_at": c.paid_at.isoformat() if c.paid_at else None,
        "created_by_id": str(created_by.pk) if created_by else None,
        "created_by_name": (created_by.full_name or created_by.username) if created_by else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "supplier_payment_id": (
            str(c.supplier_payment_id) if getattr(c, "supplier_payment_id", None) else None
        ),
        "supplier_payment_code": (
            c.supplier_payment.code if getattr(c, "supplier_payment", None) else None
        ),
        "supplier_name": (
            c.supplier_payment.supplier.name_ar
            if getattr(c, "supplier_payment", None) and c.supplier_payment.supplier_id
            else None
        ),
        "source": "supplier_payment" if getattr(c, "supplier_payment_id", None) else "manual",
    }


# ——— Banks ———


def list_banks() -> list[dict]:
    qs = Bank.objects.using(_USING).filter(is_active=True).order_by("code")
    return [_serialize_bank(b) for b in qs]


@transaction.atomic(using=_USING)
def create_bank(*, data: dict) -> Bank:
    code = (data.get("code") or "").strip() or catalog_service._next_code("BNK", Bank)
    return Bank.objects.using(_USING).create(
        code=code,
        name_ar=data["name_ar"],
        name_en=data.get("name_en", ""),
    )


@transaction.atomic(using=_USING)
def update_bank(pk, *, data: dict) -> Bank:
    item = Bank.objects.using(_USING).get(pk=pk, is_active=True)
    if "name_ar" in data:
        item.name_ar = data["name_ar"]
    if "name_en" in data:
        item.name_en = data.get("name_en", "")
    item.save(using=_USING)
    return item


@transaction.atomic(using=_USING)
def delete_bank(pk) -> None:
    item = Bank.objects.using(_USING).get(pk=pk)
    if BankAccount.objects.using(_USING).filter(bank=item, is_active=True).exists():
        raise ValidationError("لا يمكن حذف بنك مرتبط بحسابات بنكية نشطة.")
    item.is_active = False
    item.save(using=_USING, update_fields=["is_active"])


# ——— Bank accounts ———


def list_bank_accounts(*, bank_id=None) -> list[dict]:
    qs = (
        BankAccount.objects.using(_USING)
        .filter(is_active=True)
        .select_related("bank")
        .order_by("code")
    )
    if bank_id:
        qs = qs.filter(bank_id=bank_id)
    return [_serialize_account(a) for a in qs]


@transaction.atomic(using=_USING)
def create_bank_account(*, data: dict) -> BankAccount:
    code = (data.get("code") or "").strip() or catalog_service._next_code("BAC", BankAccount)
    return BankAccount.objects.using(_USING).create(
        code=code,
        name_ar=data["name_ar"],
        name_en=data.get("name_en", ""),
        bank_id=data["bank"],
        account_number=(data.get("account_number") or "").strip(),
        opening_balance=Decimal(str(data.get("opening_balance") or 0)),
        gl_account_id=data.get("gl_account"),
        notes=(data.get("notes") or "").strip(),
    )


@transaction.atomic(using=_USING)
def update_bank_account(pk, *, data: dict) -> BankAccount:
    item = BankAccount.objects.using(_USING).get(pk=pk, is_active=True)
    for field in ("name_ar", "name_en", "account_number", "notes"):
        if field in data:
            setattr(item, field, data[field])
    if "bank" in data:
        item.bank_id = data["bank"]
    if "opening_balance" in data:
        if BankAccountMovement.objects.using(_USING).filter(
            bank_account=item, status=BankAccountMovement.Status.POSTED
        ).exists():
            raise ValidationError("لا يمكن تغيير الرصيد الافتتاحي بعد وجود حركات مرحّلة.")
        item.opening_balance = Decimal(str(data["opening_balance"]))
    if "gl_account" in data:
        item.gl_account_id = data.get("gl_account")
    item.save(using=_USING)
    return item


@transaction.atomic(using=_USING)
def delete_bank_account(pk) -> None:
    item = BankAccount.objects.using(_USING).get(pk=pk)
    if Cheque.objects.using(_USING).filter(
        bank_account=item, status=Cheque.Status.PENDING
    ).exists():
        raise ValidationError("لا يمكن حذف حساب له شيكات معلقة.")
    item.is_active = False
    item.save(using=_USING, update_fields=["is_active", "updated_at"])


def list_account_movements(*, account_id=None) -> list[dict]:
    qs = (
        BankAccountMovement.objects.using(_USING)
        .select_related("bank_account", "counter_account", "created_by")
        .order_by("-movement_date", "-created_at")[:300]
    )
    if account_id:
        qs = qs.filter(bank_account_id=account_id)
    return [_serialize_movement(m) for m in qs]


@transaction.atomic(using=_USING)
def create_account_movement(*, data: dict, user, post: bool = False) -> BankAccountMovement:
    amount = Decimal(str(data["amount"]))
    if amount <= 0:
        raise ValidationError("المبلغ يجب أن يكون أكبر من صفر.")
    mtype = data["movement_type"]
    code = catalog_service._next_code("BMV", BankAccountMovement)
    movement = BankAccountMovement.objects.using(_USING).create(
        code=code,
        bank_account_id=data["bank_account"],
        counter_account_id=data.get("counter_account"),
        movement_type=mtype,
        movement_date=data.get("movement_date") or timezone.localdate(),
        amount=amount,
        notes=(data.get("notes") or "").strip(),
        created_by=user,
    )
    if mtype == BankAccountMovement.MovementType.TRANSFER_OUT:
        if not data.get("counter_account"):
            raise ValidationError("حدد الحساب المستلم للتحويل.")
        counter_code = catalog_service._next_code("BMV", BankAccountMovement)
        BankAccountMovement.objects.using(_USING).create(
            code=counter_code,
            bank_account_id=data["counter_account"],
            counter_account_id=data["bank_account"],
            movement_type=BankAccountMovement.MovementType.TRANSFER_IN,
            movement_date=movement.movement_date,
            amount=amount,
            notes=f"تحويل من {movement.bank_account.code}",
            status=BankAccountMovement.Status.DRAFT,
            created_by=user,
        )
    if post:
        movement = post_account_movement(movement.pk, user)
    return movement


@transaction.atomic(using=_USING)
def post_account_movement(movement_id, user) -> BankAccountMovement:
    movement = (
        BankAccountMovement.objects.using(_USING)
        .select_for_update()
        .select_related("bank_account")
        .get(pk=movement_id)
    )
    if movement.status != BankAccountMovement.Status.DRAFT:
        raise ValidationError("الحركة مرحّلة أو ملغاة بالفعل.")
    if movement.movement_type in _OUTFLOW:
        bal = _account_balance(movement.bank_account_id)
        if movement.amount > bal:
            raise ValidationError(
                f"رصيد الحساب غير كافٍ. المتاح: {bal} — المطلوب: {movement.amount}"
            )
    movement.status = BankAccountMovement.Status.POSTED
    movement.posted_at = timezone.now()
    movement.save(using=_USING, update_fields=["status", "posted_at"])
    if movement.movement_type == BankAccountMovement.MovementType.TRANSFER_OUT:
        counter = (
            BankAccountMovement.objects.using(_USING)
            .filter(
                bank_account_id=movement.counter_account_id,
                counter_account_id=movement.bank_account_id,
                movement_type=BankAccountMovement.MovementType.TRANSFER_IN,
                status=BankAccountMovement.Status.DRAFT,
                amount=movement.amount,
            )
            .first()
        )
        if counter:
            counter.status = BankAccountMovement.Status.POSTED
            counter.posted_at = timezone.now()
            counter.save(using=_USING, update_fields=["status", "posted_at"])
    return movement


# ——— Cheques ———


def list_cheques(*, status=None, direction=None, paper_type=None, source=None) -> list[dict]:
    qs = Cheque.objects.using(_USING).select_related(
        "bank_account",
        "bank_account__bank",
        "pay_bank_account",
        "created_by",
        "supplier_payment",
        "supplier_payment__supplier",
    )
    if status:
        if status == Cheque.Status.RETURNED:
            qs = qs.filter(status__in=[Cheque.Status.RETURNED, Cheque.Status.REJECTED])
        else:
            qs = qs.filter(status=status)
    if direction:
        qs = qs.filter(direction=direction)
    if paper_type:
        qs = qs.filter(paper_type=paper_type)
    qs = qs.order_by("due_date", "-created_at")[:500]
    return [_serialize_cheque(c) for c in qs]


def cheque_alerts(*, days: int = 2) -> list[dict]:
    today = timezone.localdate()
    until = today + timedelta(days=days)
    qs = (
        Cheque.objects.using(_USING)
        .filter(
            status__in=[Cheque.Status.PENDING, Cheque.Status.DELIVERED],
            due_date__gte=today,
            due_date__lte=until,
        )
        .select_related("bank_account", "bank_account__bank")
        .order_by("due_date")
    )
    rows = []
    for c in qs:
        d = _serialize_cheque(c)
        d["days_until_due"] = (c.due_date - today).days
        rows.append(d)
    return rows


@transaction.atomic(using=_USING)
def create_cheque(*, data: dict, user) -> Cheque:
    amount = Decimal(str(data["amount"]))
    if amount <= 0:
        raise ValidationError("مبلغ الشيك يجب أن يكون أكبر من صفر.")
    code = catalog_service._next_code("CHQ", Cheque)
    cheque = Cheque.objects.using(_USING).create(
        code=code,
        paper_type=data.get("paper_type", Cheque.PaperType.CHEQUE),
        direction=data.get("direction", Cheque.Direction.PAYABLE),
        cheque_number=(data.get("cheque_number") or "").strip(),
        bank_account_id=data["bank_account"],
        amount=amount,
        due_date=data["due_date"],
        delivery_date=data.get("delivery_date"),
        party_name=(data.get("party_name") or "").strip(),
        notes=(data.get("notes") or "").strip(),
        supplier_payment_id=data.get("supplier_payment"),
        created_by=user,
    )
    return cheque


def _paper_type_for_supplier_method(method: str) -> str:
    from erp.supplier_models import SupplierPayment

    mapping = {
        SupplierPayment.PaymentMethod.CHEQUE: Cheque.PaperType.CHEQUE,
        SupplierPayment.PaymentMethod.PROMISSORY_NOTE: Cheque.PaperType.PROMISSORY_NOTE,
        SupplierPayment.PaymentMethod.OTHER_PAPERS: Cheque.PaperType.OTHER_PAPER,
    }
    return mapping.get(method, Cheque.PaperType.CHEQUE)


def sync_supplier_payment_paper(payment, user) -> Cheque | None:
    """إنشاء ورقة متابعة مرتبطة بإذن دفع مورد (شيك / كمبيالة)."""
    from erp.supplier_models import SupplierPayment

    paper_methods = {
        SupplierPayment.PaymentMethod.CHEQUE,
        SupplierPayment.PaymentMethod.PROMISSORY_NOTE,
        SupplierPayment.PaymentMethod.OTHER_PAPERS,
    }
    if payment.payment_method not in paper_methods:
        return None

    existing = getattr(payment, "payment_paper", None)
    if existing:
        return existing

    number = (payment.paper_cheque_number or "").strip()
    if not number or not payment.paper_bank_account_id or not payment.paper_due_date:
        raise ValidationError(
            "لطرق الشيك وأوراق الدفع: أدخل رقم الورقة والحساب البنكي وتاريخ الاستحقاق."
        )

    supplier_name = payment.supplier.name_ar if payment.supplier_id else ""
    return create_cheque(
        data={
            "paper_type": _paper_type_for_supplier_method(payment.payment_method),
            "direction": Cheque.Direction.PAYABLE,
            "cheque_number": number,
            "bank_account": str(payment.paper_bank_account_id),
            "amount": str(payment.amount),
            "due_date": payment.paper_due_date.isoformat(),
            "party_name": supplier_name,
            "notes": f"إذن دفع مورد {payment.code}",
            "supplier_payment": str(payment.pk),
        },
        user=user,
    )


@transaction.atomic(using=_USING)
def update_cheque(pk, *, data: dict) -> Cheque:
    cheque = Cheque.objects.using(_USING).select_for_update().get(pk=pk)
    if cheque.status not in (Cheque.Status.PENDING, Cheque.Status.DELIVERED):
        raise ValidationError("لا يمكن تعديل ورقة في هذه الحالة.")
    for field in ("cheque_number", "party_name", "notes", "due_date", "delivery_date", "paper_type"):
        if field in data:
            setattr(cheque, field, data[field])
    if "amount" in data:
        cheque.amount = Decimal(str(data["amount"]))
    if "bank_account" in data:
        cheque.bank_account_id = data["bank_account"]
    cheque.save(using=_USING)
    return cheque


@transaction.atomic(using=_USING)
def deliver_cheque(pk, *, delivery_date=None) -> Cheque:
    cheque = Cheque.objects.using(_USING).select_for_update().get(pk=pk)
    if cheque.status != Cheque.Status.PENDING:
        raise ValidationError("يمكن تسليم الأوراق قيد الانتظار فقط.")
    cheque.status = Cheque.Status.DELIVERED
    cheque.delivery_date = delivery_date or timezone.localdate()
    cheque.save(using=_USING, update_fields=["status", "delivery_date", "updated_at"])
    return cheque


@transaction.atomic(using=_USING)
def pay_cheque(pk, user, data: dict | None = None) -> Cheque:
    data = data or {}
    cheque = (
        Cheque.objects.using(_USING)
        .select_for_update()
        .select_related("bank_account")
        .get(pk=pk)
    )
    if cheque.status not in (Cheque.Status.PENDING, Cheque.Status.DELIVERED):
        raise ValidationError("لا يمكن صرف ورقة في هذه الحالة.")
    pay_source = data.get("pay_source") or Cheque.PaySource.BANK
    pay_amount = Decimal(str(data.get("amount", cheque.amount)))
    if pay_amount <= 0:
        raise ValidationError("مبلغ الصرف يجب أن يكون أكبر من صفر.")
    pay_date = data.get("pay_date") or timezone.localdate()
    pay_notes = (data.get("pay_notes") or data.get("notes") or "").strip()
    pay_bank_id = data.get("pay_bank_account") or data.get("bank_account")

    if pay_source == Cheque.PaySource.BANK:
        account_id = pay_bank_id or str(cheque.bank_account_id)
        mtype = (
            BankAccountMovement.MovementType.WITHDRAWAL
            if cheque.direction == Cheque.Direction.PAYABLE
            else BankAccountMovement.MovementType.DEPOSIT
        )
        movement = create_account_movement(
            data={
                "bank_account": account_id,
                "movement_type": mtype,
                "movement_date": pay_date,
                "amount": str(pay_amount),
                "notes": pay_notes or f"صرف {cheque.cheque_number} — {cheque.party_name}",
            },
            user=user,
            post=True,
        )
        BankAccountMovement.objects.using(_USING).filter(pk=movement.pk).update(cheque=cheque)
        cheque.pay_bank_account_id = account_id
    else:
        cheque.pay_bank_account_id = None

    cheque.status = Cheque.Status.PAID
    cheque.pay_source = pay_source
    cheque.pay_amount = pay_amount
    cheque.pay_date = pay_date
    cheque.pay_notes = pay_notes
    cheque.paid_at = timezone.now()
    cheque.save(
        using=_USING,
        update_fields=[
            "status",
            "pay_source",
            "pay_bank_account_id",
            "pay_amount",
            "pay_date",
            "pay_notes",
            "paid_at",
            "updated_at",
        ],
    )
    return cheque


@transaction.atomic(using=_USING)
def cancel_cheque(pk) -> Cheque:
    cheque = Cheque.objects.using(_USING).select_for_update().get(pk=pk)
    if cheque.status not in (Cheque.Status.PENDING, Cheque.Status.DELIVERED):
        raise ValidationError("لا يمكن إلغاء ورقة في هذه الحالة.")
    cheque.status = Cheque.Status.CANCELLED
    cheque.save(using=_USING, update_fields=["status", "updated_at"])
    return cheque


@transaction.atomic(using=_USING)
def reject_cheque(pk) -> Cheque:
    return return_cheque(pk)


@transaction.atomic(using=_USING)
def return_cheque(pk) -> Cheque:
    cheque = Cheque.objects.using(_USING).select_for_update().get(pk=pk)
    if cheque.status not in (Cheque.Status.PENDING, Cheque.Status.DELIVERED):
        raise ValidationError("لا يمكن إرجاع ورقة في هذه الحالة.")
    cheque.status = Cheque.Status.RETURNED
    cheque.save(using=_USING, update_fields=["status", "updated_at"])
    return cheque


@transaction.atomic(using=_USING)
def delete_cheque(pk) -> None:
    cheque = Cheque.objects.using(_USING).get(pk=pk)
    if cheque.status != Cheque.Status.PENDING:
        raise ValidationError("لا يمكن حذف شيك غير معلق.")
    cheque.delete()
