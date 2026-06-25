"""خدمات الفيزا والمحافظ والتحويلات وكشوف الحساب."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.db import models, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.banking_models import (
    Bank,
    BankAccount,
    BankAccountMovement,
    CardMerchantAccount,
    CardNetwork,
    CardTransaction,
    ChannelTransfer,
    EWalletAccount,
    EWalletMovement,
    EWalletProvider,
)
from erp.services import banking as banking_service
from erp.services import catalog as catalog_service

_USING = "tenant"

_WALLET_INFLOW = (
    EWalletMovement.MovementType.DEPOSIT,
    EWalletMovement.MovementType.TRANSFER_IN,
)
_WALLET_OUTFLOW = (
    EWalletMovement.MovementType.WITHDRAWAL,
    EWalletMovement.MovementType.TRANSFER_OUT,
)


def _wallet_balance(account_id) -> Decimal:
    account = EWalletAccount.objects.using(_USING).get(pk=account_id)
    total = account.opening_balance or Decimal("0")
    posted = EWalletMovement.objects.using(_USING).filter(
        status=EWalletMovement.Status.POSTED
    )
    for m in posted.filter(e_wallet_account_id=account_id):
        if m.movement_type in _WALLET_INFLOW:
            total += m.amount
        else:
            total -= m.amount
    for m in posted.filter(
        counter_wallet_id=account_id,
        movement_type=EWalletMovement.MovementType.TRANSFER_OUT,
    ):
        total += m.amount
    return total.quantize(Decimal("0.01"))


def _card_pending(account_id) -> Decimal:
    return (
        CardTransaction.objects.using(_USING)
        .filter(
            card_merchant_account_id=account_id,
            status=CardTransaction.Status.PENDING,
        )
        .aggregate(total=models.Sum("amount"))["total"]
        or Decimal("0")
    )


def _card_settled_total(account_id) -> Decimal:
    return (
        CardTransaction.objects.using(_USING)
        .filter(
            card_merchant_account_id=account_id,
            status=CardTransaction.Status.SETTLED,
        )
        .aggregate(total=models.Sum("amount"))["total"]
        or Decimal("0")
    )


def _serialize_card_network(n: CardNetwork) -> dict:
    return {
        "id": str(n.pk),
        "code": n.code,
        "name_ar": n.name_ar,
        "name_en": n.name_en,
        "is_active": n.is_active,
    }


def _serialize_card_account(a: CardMerchantAccount) -> dict:
    pending = _card_pending(a.pk)
    settled = _card_settled_total(a.pk)
    return {
        "id": str(a.pk),
        "code": a.code,
        "name_ar": a.name_ar,
        "name_en": a.name_en,
        "card_network": str(a.card_network_id),
        "card_network_name": a.card_network.name_ar,
        "bank_account": str(a.bank_account_id),
        "bank_account_name": a.bank_account.name_ar,
        "bank_name": a.bank_account.bank.name_ar,
        "opening_balance": str(a.opening_balance),
        "pending_balance": str(pending),
        "settled_balance": str(settled),
        "current_balance": str((a.opening_balance + settled).quantize(Decimal("0.01"))),
        "notes": a.notes,
        "is_active": a.is_active,
    }


def _serialize_card_tx(t: CardTransaction) -> dict:
    return {
        "id": str(t.pk),
        "code": t.code,
        "transaction_number": t.transaction_number,
        "card_merchant_account": str(t.card_merchant_account_id),
        "card_merchant_account_name": t.card_merchant_account.name_ar,
        "card_network_name": t.card_merchant_account.card_network.name_ar,
        "bank_account": str(t.bank_account_id),
        "bank_account_name": t.bank_account.name_ar,
        "bank_name": t.bank_account.bank.name_ar,
        "amount": str(t.amount),
        "transaction_date": t.transaction_date.isoformat(),
        "party_type": t.party_type,
        "customer": str(t.customer_id) if t.customer_id else None,
        "customer_name": t.customer.name_ar if t.customer else None,
        "supplier": str(t.supplier_id) if t.supplier_id else None,
        "supplier_name": t.supplier.name_ar if t.supplier else None,
        "party_name": t.party_name,
        "sale": str(t.sale_id) if t.sale_id else None,
        "sale_code": t.sale.code if t.sale else None,
        "status": t.status,
        "settled_at": t.settled_at.isoformat() if t.settled_at else None,
        "notes": t.notes,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _serialize_wallet_provider(p: EWalletProvider) -> dict:
    return {
        "id": str(p.pk),
        "code": p.code,
        "name_ar": p.name_ar,
        "name_en": p.name_en,
        "is_active": p.is_active,
    }


def _serialize_wallet_account(a: EWalletAccount) -> dict:
    bal = _wallet_balance(a.pk)
    return {
        "id": str(a.pk),
        "code": a.code,
        "name_ar": a.name_ar,
        "name_en": a.name_en,
        "provider": str(a.provider_id),
        "provider_name": a.provider.name_ar,
        "wallet_number": a.wallet_number,
        "bank_account": str(a.bank_account_id) if a.bank_account_id else None,
        "bank_account_name": a.bank_account.name_ar if a.bank_account else None,
        "opening_balance": str(a.opening_balance),
        "current_balance": str(bal),
        "notes": a.notes,
        "is_active": a.is_active,
    }


def _serialize_wallet_movement(m: EWalletMovement) -> dict:
    return {
        "id": str(m.pk),
        "code": m.code,
        "e_wallet_account": str(m.e_wallet_account_id),
        "e_wallet_account_name": m.e_wallet_account.name_ar,
        "counter_wallet": str(m.counter_wallet_id) if m.counter_wallet_id else None,
        "counter_wallet_name": m.counter_wallet.name_ar if m.counter_wallet else None,
        "movement_type": m.movement_type,
        "movement_date": m.movement_date.isoformat(),
        "amount": str(m.amount),
        "status": m.status,
        "sale": str(m.sale_id) if m.sale_id else None,
        "sale_code": m.sale.code if m.sale else None,
        "notes": m.notes,
        "posted_at": m.posted_at.isoformat() if m.posted_at else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _serialize_channel_transfer(t: ChannelTransfer) -> dict:
    return {
        "id": str(t.pk),
        "code": t.code,
        "from_bank_account": str(t.from_bank_account_id) if t.from_bank_account_id else None,
        "from_bank_account_name": t.from_bank_account.name_ar if t.from_bank_account else None,
        "from_wallet": str(t.from_wallet_id) if t.from_wallet_id else None,
        "from_wallet_name": t.from_wallet.name_ar if t.from_wallet else None,
        "to_bank_account": str(t.to_bank_account_id) if t.to_bank_account_id else None,
        "to_bank_account_name": t.to_bank_account.name_ar if t.to_bank_account else None,
        "to_wallet": str(t.to_wallet_id) if t.to_wallet_id else None,
        "to_wallet_name": t.to_wallet.name_ar if t.to_wallet else None,
        "amount": str(t.amount),
        "transfer_date": t.transfer_date.isoformat(),
        "status": t.status,
        "notes": t.notes,
        "posted_at": t.posted_at.isoformat() if t.posted_at else None,
    }


def payment_methods_dashboard(*, date_from=None, date_to=None) -> dict:
    """لوحة طرق الدفع: كاش، فيزا، محافظ، InstaPay وتدفق نقدي يومي."""
    from erp.sale_models import SalePayment

    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to) or timezone.localdate()
    payments = SalePayment.objects.using(_USING).select_related("sale").filter(
        sale__created_at__date__lte=d_to
    )
    if d_from:
        payments = payments.filter(sale__created_at__date__gte=d_from)

    totals = {
        "cash": Decimal("0"),
        "card": Decimal("0"),
        "wallet": Decimal("0"),
        "instapay": Decimal("0"),
        "credit": Decimal("0"),
        "installment": Decimal("0"),
        "reserved": Decimal("0"),
    }
    daily: dict[str, dict[str, Decimal]] = {}
    for p in payments.order_by("sale__created_at"):
        key = p.payment_method
        if key in totals:
            totals[key] += p.amount
        day = p.sale.created_at.date().isoformat()
        daily.setdefault(day, {k: Decimal("0") for k in totals})
        if key in daily[day]:
            daily[day][key] += p.amount

    wallet_movements = EWalletMovement.objects.using(_USING).select_related("e_wallet_account__provider")
    wallet_movements = wallet_movements.filter(status=EWalletMovement.Status.POSTED, movement_date__lte=d_to)
    if d_from:
        wallet_movements = wallet_movements.filter(movement_date__gte=d_from)
    instapay_total = Decimal("0")
    for m in wallet_movements:
        name = f"{m.e_wallet_account.name_ar} {m.e_wallet_account.provider.name_ar}".lower()
        if "instapay" in name or "انستا" in name:
            if m.movement_type in _WALLET_INFLOW:
                instapay_total += m.amount
            elif m.movement_type in _WALLET_OUTFLOW:
                instapay_total -= m.amount
    totals["instapay"] = instapay_total

    card_pending = CardTransaction.objects.using(_USING).filter(
        status=CardTransaction.Status.PENDING,
        transaction_date__lte=d_to,
    )
    card_settled = CardTransaction.objects.using(_USING).filter(
        status=CardTransaction.Status.SETTLED,
        transaction_date__lte=d_to,
    )
    if d_from:
        card_pending = card_pending.filter(transaction_date__gte=d_from)
        card_settled = card_settled.filter(transaction_date__gte=d_from)

    return {
        "date_from": d_from.isoformat() if d_from else None,
        "date_to": d_to.isoformat(),
        "cards": {
            "pending": str((card_pending.aggregate(total=models.Sum("amount"))["total"] or Decimal("0")).quantize(Decimal("0.01"))),
            "settled": str((card_settled.aggregate(total=models.Sum("amount"))["total"] or Decimal("0")).quantize(Decimal("0.01"))),
        },
        "totals": {k: str(v.quantize(Decimal("0.01"))) for k, v in totals.items()},
        "cash_flow": [
            {
                "date": day,
                **{k: str(v.quantize(Decimal("0.01"))) for k, v in values.items()},
                "total": str(sum(values.values(), Decimal("0")).quantize(Decimal("0.01"))),
            }
            for day, values in sorted(daily.items())
        ],
    }


# ——— Card networks ———


def list_card_networks() -> list[dict]:
    qs = CardNetwork.objects.using(_USING).filter(is_active=True).order_by("code")
    return [_serialize_card_network(n) for n in qs]


@transaction.atomic(using=_USING)
def create_card_network(*, data: dict) -> CardNetwork:
    code = (data.get("code") or "").strip() or catalog_service._next_code("CNW", CardNetwork)
    return CardNetwork.objects.using(_USING).create(
        code=code,
        name_ar=data["name_ar"],
        name_en=data.get("name_en", ""),
    )


@transaction.atomic(using=_USING)
def update_card_network(pk, *, data: dict) -> CardNetwork:
    item = CardNetwork.objects.using(_USING).get(pk=pk, is_active=True)
    if "name_ar" in data:
        item.name_ar = data["name_ar"]
    if "name_en" in data:
        item.name_en = data.get("name_en", "")
    item.save(using=_USING)
    return item


@transaction.atomic(using=_USING)
def delete_card_network(pk) -> None:
    item = CardNetwork.objects.using(_USING).get(pk=pk)
    if CardMerchantAccount.objects.using(_USING).filter(card_network=item, is_active=True).exists():
        raise ValidationError("لا يمكن حذف شبكة مرتبطة بحسابات تاجر نشطة.")
    item.is_active = False
    item.save(using=_USING, update_fields=["is_active"])


# ——— Card merchant accounts ———


def list_card_accounts(*, network_id=None) -> list[dict]:
    qs = (
        CardMerchantAccount.objects.using(_USING)
        .filter(is_active=True)
        .select_related("card_network", "bank_account", "bank_account__bank")
        .order_by("code")
    )
    if network_id:
        qs = qs.filter(card_network_id=network_id)
    return [_serialize_card_account(a) for a in qs]


@transaction.atomic(using=_USING)
def create_card_account(*, data: dict) -> CardMerchantAccount:
    code = (data.get("code") or "").strip() or catalog_service._next_code("CMA", CardMerchantAccount)
    return CardMerchantAccount.objects.using(_USING).create(
        code=code,
        name_ar=data["name_ar"],
        name_en=data.get("name_en", ""),
        card_network_id=data["card_network"],
        bank_account_id=data["bank_account"],
        opening_balance=Decimal(str(data.get("opening_balance") or 0)),
        notes=(data.get("notes") or "").strip(),
    )


@transaction.atomic(using=_USING)
def update_card_account(pk, *, data: dict) -> CardMerchantAccount:
    item = CardMerchantAccount.objects.using(_USING).get(pk=pk, is_active=True)
    for field in ("name_ar", "name_en", "notes"):
        if field in data:
            setattr(item, field, data[field])
    if "card_network" in data:
        item.card_network_id = data["card_network"]
    if "bank_account" in data:
        item.bank_account_id = data["bank_account"]
    item.save(using=_USING)
    return item


@transaction.atomic(using=_USING)
def delete_card_account(pk) -> None:
    item = CardMerchantAccount.objects.using(_USING).get(pk=pk)
    if CardTransaction.objects.using(_USING).filter(
        card_merchant_account=item, status=CardTransaction.Status.PENDING
    ).exists():
        raise ValidationError("لا يمكن حذف حساب فيه عمليات معلقة.")
    item.is_active = False
    item.save(using=_USING, update_fields=["is_active"])


# ——— Card transactions ———


def list_card_transactions(*, status=None, account_id=None) -> list[dict]:
    qs = (
        CardTransaction.objects.using(_USING)
        .select_related(
            "card_merchant_account",
            "card_merchant_account__card_network",
            "bank_account",
            "bank_account__bank",
            "customer",
            "supplier",
            "sale",
        )
        .order_by("-transaction_date", "-created_at")[:500]
    )
    if status:
        qs = qs.filter(status=status)
    if account_id:
        qs = qs.filter(card_merchant_account_id=account_id)
    return [_serialize_card_tx(t) for t in qs]


@transaction.atomic(using=_USING)
def create_card_transaction(*, data: dict, user) -> CardTransaction:
    amount = Decimal(str(data["amount"]))
    if amount <= 0:
        raise ValidationError("المبلغ يجب أن يكون أكبر من صفر.")
    merchant = (
        CardMerchantAccount.objects.using(_USING)
        .select_related("bank_account")
        .get(pk=data["card_merchant_account"], is_active=True)
    )
    code = catalog_service._next_code("CTX", CardTransaction)
    party_type = data.get("party_type", CardTransaction.PartyType.OTHER)
    return CardTransaction.objects.using(_USING).create(
        code=code,
        transaction_number=(data.get("transaction_number") or code).strip(),
        card_merchant_account=merchant,
        bank_account_id=data.get("bank_account") or merchant.bank_account_id,
        amount=amount,
        transaction_date=data.get("transaction_date") or timezone.localdate(),
        party_type=party_type,
        customer_id=data.get("customer"),
        supplier_id=data.get("supplier"),
        party_name=(data.get("party_name") or "").strip(),
        sale_id=data.get("sale"),
        notes=(data.get("notes") or "").strip(),
        created_by=user,
        status=CardTransaction.Status.PENDING,
    )


@transaction.atomic(using=_USING)
def settle_card_transaction(pk, user) -> CardTransaction:
    tx = (
        CardTransaction.objects.using(_USING)
        .select_for_update()
        .select_related("bank_account", "card_merchant_account")
        .get(pk=pk)
    )
    if tx.status != CardTransaction.Status.PENDING:
        raise ValidationError("العملية ليست معلقة.")
    movement = banking_service.create_account_movement(
        data={
            "bank_account": str(tx.bank_account_id),
            "movement_type": BankAccountMovement.MovementType.DEPOSIT,
            "movement_date": timezone.localdate(),
            "amount": str(tx.amount),
            "notes": f"تسوية فيزا {tx.transaction_number} — {tx.card_merchant_account.name_ar}",
        },
        user=user,
        post=True,
    )
    tx.status = CardTransaction.Status.SETTLED
    tx.settlement_movement_id = movement.pk
    tx.settled_at = timezone.now()
    tx.save(using=_USING, update_fields=["status", "settlement_movement_id", "settled_at"])
    return tx


@transaction.atomic(using=_USING)
def reject_card_transaction(pk) -> CardTransaction:
    tx = CardTransaction.objects.using(_USING).select_for_update().get(pk=pk)
    if tx.status != CardTransaction.Status.PENDING:
        raise ValidationError("العملية ليست معلقة.")
    tx.status = CardTransaction.Status.REJECTED
    tx.save(using=_USING, update_fields=["status"])
    return tx


def record_sale_card(*, sale, user, data: dict) -> CardTransaction | None:
    """تسجيل عملية فيزا تلقائياً عند بيع POS."""
    from erp.sale_models import Sale

    if sale.payment_method not in (Sale.PaymentMethod.CARD, Sale.PaymentMethod.MIXED):
        return None
    amount = Decimal(str(data.get("card_amount") or sale.total))
    if amount <= 0:
        return None
    merchant_id = data.get("card_merchant_account")
    if not merchant_id:
        default = (
            CardMerchantAccount.objects.using(_USING)
            .filter(is_active=True)
            .order_by("code")
            .first()
        )
        if not default:
            return None
        merchant_id = str(default.pk)
    customer_id = data.get("customer") or (str(sale.customer_id) if sale.customer_id else None)
    party_name = ""
    party_type = CardTransaction.PartyType.OTHER
    if sale.customer_id:
        from erp.customer_models import Customer

        customer = Customer.objects.using(_USING).filter(pk=sale.customer_id).first()
        if customer:
            party_name = customer.name_ar
            party_type = CardTransaction.PartyType.CUSTOMER
            customer_id = str(sale.customer_id)
    return create_card_transaction(
        data={
            "card_merchant_account": merchant_id,
            "transaction_number": data.get("card_transaction_number") or sale.code,
            "amount": str(amount),
            "party_type": party_type,
            "customer": customer_id,
            "party_name": party_name,
            "sale": str(sale.pk),
            "notes": f"بيع POS {sale.code}",
        },
        user=user,
    )


def record_sale_wallet(*, sale, user, data: dict):
    """إيداع محفظة تلقائياً عند بيع POS بالمحفظة."""
    from erp.sale_models import Sale

    if sale.payment_method not in (Sale.PaymentMethod.WALLET, Sale.PaymentMethod.MIXED):
        return None
    amount = Decimal(str(data.get("wallet_amount") or sale.total))
    if amount <= 0:
        return None
    wallet_id = data.get("e_wallet_account")
    if not wallet_id:
        default = EWalletAccount.objects.using(_USING).filter(is_active=True).order_by("code").first()
        if not default:
            return None
        wallet_id = str(default.pk)
    return create_wallet_movement(
        data={
            "e_wallet_account": wallet_id,
            "movement_type": EWalletMovement.MovementType.DEPOSIT,
            "amount": str(amount),
            "movement_date": timezone.localdate(),
            "sale": str(sale.pk),
            "notes": f"بيع POS {sale.code}",
            "post": True,
        },
        user=user,
    )


# ——— E-wallet providers ———


def list_wallet_providers() -> list[dict]:
    qs = EWalletProvider.objects.using(_USING).filter(is_active=True).order_by("code")
    return [_serialize_wallet_provider(p) for p in qs]


@transaction.atomic(using=_USING)
def create_wallet_provider(*, data: dict) -> EWalletProvider:
    code = (data.get("code") or "").strip() or catalog_service._next_code("EWP", EWalletProvider)
    return EWalletProvider.objects.using(_USING).create(
        code=code,
        name_ar=data["name_ar"],
        name_en=data.get("name_en", ""),
    )


@transaction.atomic(using=_USING)
def update_wallet_provider(pk, *, data: dict) -> EWalletProvider:
    item = EWalletProvider.objects.using(_USING).get(pk=pk, is_active=True)
    if "name_ar" in data:
        item.name_ar = data["name_ar"]
    if "name_en" in data:
        item.name_en = data.get("name_en", "")
    item.save(using=_USING)
    return item


@transaction.atomic(using=_USING)
def delete_wallet_provider(pk) -> None:
    item = EWalletProvider.objects.using(_USING).get(pk=pk)
    if EWalletAccount.objects.using(_USING).filter(provider=item, is_active=True).exists():
        raise ValidationError("لا يمكن حذف مزود مرتبط بمحافظ نشطة.")
    item.is_active = False
    item.save(using=_USING, update_fields=["is_active"])


# ——— E-wallet accounts ———


def list_wallet_accounts(*, provider_id=None) -> list[dict]:
    qs = (
        EWalletAccount.objects.using(_USING)
        .filter(is_active=True)
        .select_related("provider", "bank_account")
        .order_by("code")
    )
    if provider_id:
        qs = qs.filter(provider_id=provider_id)
    return [_serialize_wallet_account(a) for a in qs]


@transaction.atomic(using=_USING)
def create_wallet_account(*, data: dict) -> EWalletAccount:
    code = (data.get("code") or "").strip() or catalog_service._next_code("EWA", EWalletAccount)
    return EWalletAccount.objects.using(_USING).create(
        code=code,
        name_ar=data["name_ar"],
        name_en=data.get("name_en", ""),
        provider_id=data["provider"],
        wallet_number=(data.get("wallet_number") or "").strip(),
        bank_account_id=data.get("bank_account"),
        opening_balance=Decimal(str(data.get("opening_balance") or 0)),
        notes=(data.get("notes") or "").strip(),
    )


@transaction.atomic(using=_USING)
def update_wallet_account(pk, *, data: dict) -> EWalletAccount:
    item = EWalletAccount.objects.using(_USING).get(pk=pk, is_active=True)
    for field in ("name_ar", "name_en", "wallet_number", "notes"):
        if field in data:
            setattr(item, field, data[field])
    if "provider" in data:
        item.provider_id = data["provider"]
    if "bank_account" in data:
        item.bank_account_id = data.get("bank_account")
    if "opening_balance" in data:
        if EWalletMovement.objects.using(_USING).filter(
            e_wallet_account=item, status=EWalletMovement.Status.POSTED
        ).exists():
            raise ValidationError("لا يمكن تغيير الرصيد الافتتاحي بعد وجود حركات مرحّلة.")
        item.opening_balance = Decimal(str(data["opening_balance"]))
    item.save(using=_USING)
    return item


@transaction.atomic(using=_USING)
def delete_wallet_account(pk) -> None:
    item = EWalletAccount.objects.using(_USING).get(pk=pk)
    item.is_active = False
    item.save(using=_USING, update_fields=["is_active", "updated_at"])


def list_wallet_movements(*, account_id=None) -> list[dict]:
    qs = (
        EWalletMovement.objects.using(_USING)
        .select_related("e_wallet_account", "counter_wallet", "sale")
        .order_by("-movement_date", "-created_at")[:300]
    )
    if account_id:
        qs = qs.filter(e_wallet_account_id=account_id)
    return [_serialize_wallet_movement(m) for m in qs]


@transaction.atomic(using=_USING)
def create_wallet_movement(*, data: dict, user, post: bool = False) -> EWalletMovement:
    amount = Decimal(str(data["amount"]))
    if amount <= 0:
        raise ValidationError("المبلغ يجب أن يكون أكبر من صفر.")
    mtype = data["movement_type"]
    code = catalog_service._next_code("WMV", EWalletMovement)
    movement = EWalletMovement.objects.using(_USING).create(
        code=code,
        e_wallet_account_id=data["e_wallet_account"],
        counter_wallet_id=data.get("counter_wallet"),
        movement_type=mtype,
        movement_date=data.get("movement_date") or timezone.localdate(),
        amount=amount,
        notes=(data.get("notes") or "").strip(),
        sale_id=data.get("sale"),
        created_by=user,
    )
    if mtype == EWalletMovement.MovementType.TRANSFER_OUT:
        if not data.get("counter_wallet"):
            raise ValidationError("حدد المحفظة المستلمة للتحويل.")
        counter_code = catalog_service._next_code("WMV", EWalletMovement)
        EWalletMovement.objects.using(_USING).create(
            code=counter_code,
            e_wallet_account_id=data["counter_wallet"],
            counter_wallet_id=data["e_wallet_account"],
            movement_type=EWalletMovement.MovementType.TRANSFER_IN,
            movement_date=movement.movement_date,
            amount=amount,
            notes=f"تحويل من {movement.e_wallet_account.code}",
            status=EWalletMovement.Status.DRAFT,
            created_by=user,
        )
    should_post = post or data.get("post") in (True, "true", "1", 1)
    if should_post:
        movement = post_wallet_movement(movement.pk, user)
    return movement


@transaction.atomic(using=_USING)
def post_wallet_movement(movement_id, user) -> EWalletMovement:
    movement = (
        EWalletMovement.objects.using(_USING)
        .select_for_update()
        .select_related("e_wallet_account")
        .get(pk=movement_id)
    )
    if movement.status != EWalletMovement.Status.DRAFT:
        raise ValidationError("الحركة مرحّلة أو ملغاة بالفعل.")
    if movement.movement_type in _WALLET_OUTFLOW:
        bal = _wallet_balance(movement.e_wallet_account_id)
        if movement.amount > bal:
            raise ValidationError(
                f"رصيد المحفظة غير كافٍ. المتاح: {bal} — المطلوب: {movement.amount}"
            )
    movement.status = EWalletMovement.Status.POSTED
    movement.posted_at = timezone.now()
    movement.save(using=_USING, update_fields=["status", "posted_at"])
    if movement.movement_type == EWalletMovement.MovementType.TRANSFER_OUT:
        counter = (
            EWalletMovement.objects.using(_USING)
            .filter(
                e_wallet_account_id=movement.counter_wallet_id,
                counter_wallet_id=movement.e_wallet_account_id,
                movement_type=EWalletMovement.MovementType.TRANSFER_IN,
                status=EWalletMovement.Status.DRAFT,
                amount=movement.amount,
            )
            .first()
        )
        if counter:
            counter.status = EWalletMovement.Status.POSTED
            counter.posted_at = timezone.now()
            counter.save(using=_USING, update_fields=["status", "posted_at"])
    return movement


# ——— Channel transfers (bank ↔ wallet) ———


def list_channel_transfers() -> list[dict]:
    qs = (
        ChannelTransfer.objects.using(_USING)
        .select_related(
            "from_bank_account",
            "from_wallet",
            "to_bank_account",
            "to_wallet",
        )
        .order_by("-transfer_date", "-created_at")[:200]
    )
    return [_serialize_channel_transfer(t) for t in qs]


@transaction.atomic(using=_USING)
def create_channel_transfer(*, data: dict, user, post: bool = True) -> ChannelTransfer:
    amount = Decimal(str(data["amount"]))
    if amount <= 0:
        raise ValidationError("المبلغ يجب أن يكون أكبر من صفر.")
    from_bank = data.get("from_bank_account")
    from_wallet = data.get("from_wallet")
    to_bank = data.get("to_bank_account")
    to_wallet = data.get("to_wallet")
    if bool(from_bank) == bool(from_wallet):
        raise ValidationError("حدد مصدر التحويل: بنك أو محفظة.")
    if bool(to_bank) == bool(to_wallet):
        raise ValidationError("حدد وجهة التحويل: بنك أو محفظة.")
    code = catalog_service._next_code("CHT", ChannelTransfer)
    transfer = ChannelTransfer.objects.using(_USING).create(
        code=code,
        from_bank_account_id=from_bank,
        from_wallet_id=from_wallet,
        to_bank_account_id=to_bank,
        to_wallet_id=to_wallet,
        amount=amount,
        transfer_date=data.get("transfer_date") or timezone.localdate(),
        notes=(data.get("notes") or "").strip(),
        created_by=user,
    )
    if post or data.get("post") in (True, "true", "1", 1):
        transfer = post_channel_transfer(transfer.pk, user)
    return transfer


@transaction.atomic(using=_USING)
def post_channel_transfer(pk, user) -> ChannelTransfer:
    transfer = (
        ChannelTransfer.objects.using(_USING)
        .select_for_update()
        .get(pk=pk)
    )
    if transfer.status != ChannelTransfer.Status.DRAFT:
        raise ValidationError("التحويل مرحّل بالفعل.")
    notes = transfer.notes or f"تحويل {transfer.code}"
    if transfer.from_bank_account_id and transfer.to_wallet_id:
        banking_service.create_account_movement(
            data={
                "bank_account": str(transfer.from_bank_account_id),
                "movement_type": BankAccountMovement.MovementType.WITHDRAWAL,
                "movement_date": transfer.transfer_date,
                "amount": str(transfer.amount),
                "notes": notes,
            },
            user=user,
            post=True,
        )
        create_wallet_movement(
            data={
                "e_wallet_account": str(transfer.to_wallet_id),
                "movement_type": EWalletMovement.MovementType.DEPOSIT,
                "movement_date": transfer.transfer_date,
                "amount": str(transfer.amount),
                "notes": notes,
            },
            user=user,
            post=True,
        )
    elif transfer.from_wallet_id and transfer.to_bank_account_id:
        create_wallet_movement(
            data={
                "e_wallet_account": str(transfer.from_wallet_id),
                "movement_type": EWalletMovement.MovementType.WITHDRAWAL,
                "movement_date": transfer.transfer_date,
                "amount": str(transfer.amount),
                "notes": notes,
            },
            user=user,
            post=True,
        )
        banking_service.create_account_movement(
            data={
                "bank_account": str(transfer.to_bank_account_id),
                "movement_type": BankAccountMovement.MovementType.DEPOSIT,
                "movement_date": transfer.transfer_date,
                "amount": str(transfer.amount),
                "notes": notes,
            },
            user=user,
            post=True,
        )
    elif transfer.from_bank_account_id and transfer.to_bank_account_id:
        banking_service.create_account_movement(
            data={
                "bank_account": str(transfer.from_bank_account_id),
                "movement_type": BankAccountMovement.MovementType.TRANSFER_OUT,
                "counter_account": str(transfer.to_bank_account_id),
                "movement_date": transfer.transfer_date,
                "amount": str(transfer.amount),
                "notes": notes,
            },
            user=user,
            post=True,
        )
    elif transfer.from_wallet_id and transfer.to_wallet_id:
        create_wallet_movement(
            data={
                "e_wallet_account": str(transfer.from_wallet_id),
                "movement_type": EWalletMovement.MovementType.TRANSFER_OUT,
                "counter_wallet": str(transfer.to_wallet_id),
                "movement_date": transfer.transfer_date,
                "amount": str(transfer.amount),
                "notes": notes,
            },
            user=user,
            post=True,
        )
    else:
        raise ValidationError("نوع التحويل غير مدعوم.")
    transfer.status = ChannelTransfer.Status.POSTED
    transfer.posted_at = timezone.now()
    transfer.save(using=_USING, update_fields=["status", "posted_at"])
    return transfer


# ——— Account statements ———


def _parse_date(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def account_statement(
    *,
    entity_type: str,
    entity_id: str,
    date_from=None,
    date_to=None,
) -> dict:
    """كشف حساب: بنك، حساب بنكي، فيزا، محفظة."""
    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to) or timezone.localdate()

    lines: list[dict] = []
    opening = Decimal("0")
    total_in = Decimal("0")
    total_out = Decimal("0")
    entity_name = ""

    if entity_type == "bank":
        bank = Bank.objects.using(_USING).get(pk=entity_id, is_active=True)
        entity_name = bank.name_ar
        accounts = BankAccount.objects.using(_USING).filter(bank=bank, is_active=True)
        for acc in accounts:
            sub = account_statement(
                entity_type="bank_account",
                entity_id=str(acc.pk),
                date_from=date_from,
                date_to=date_to,
            )
            opening += Decimal(sub["opening_balance"])
            total_in += Decimal(sub["total_in"])
            total_out += Decimal(sub["total_out"])
            lines.extend(sub["lines"])
        closing = opening + total_in - total_out
        return {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity_name,
            "date_from": d_from.isoformat() if d_from else None,
            "date_to": d_to.isoformat(),
            "opening_balance": str(opening.quantize(Decimal("0.01"))),
            "total_in": str(total_in.quantize(Decimal("0.01"))),
            "total_out": str(total_out.quantize(Decimal("0.01"))),
            "closing_balance": str(closing.quantize(Decimal("0.01"))),
            "lines": sorted(lines, key=lambda x: (x["date"], x["code"])),
        }

    if entity_type == "bank_account":
        acc = (
            BankAccount.objects.using(_USING)
            .select_related("bank")
            .get(pk=entity_id, is_active=True)
        )
        entity_name = f"{acc.name_ar} ({acc.bank.name_ar})"
        opening = acc.opening_balance
        qs = (
            BankAccountMovement.objects.using(_USING)
            .filter(bank_account=acc, status=BankAccountMovement.Status.POSTED)
            .select_related("bank_account")
            .order_by("movement_date", "created_at")
        )
        if d_from:
            qs = qs.filter(movement_date__gte=d_from)
        if d_to:
            qs = qs.filter(movement_date__lte=d_to)
        running = opening
        if d_from:
            prior = BankAccountMovement.objects.using(_USING).filter(
                bank_account=acc,
                status=BankAccountMovement.Status.POSTED,
                movement_date__lt=d_from,
            )
            for m in prior:
                if m.movement_type in banking_service._INFLOW:
                    running += m.amount
                else:
                    running -= m.amount
            opening = running
        for m in qs:
            is_in = m.movement_type in banking_service._INFLOW
            debit = m.amount if is_in else Decimal("0")
            credit = m.amount if not is_in else Decimal("0")
            if is_in:
                total_in += m.amount
                running += m.amount
            else:
                total_out += m.amount
                running -= m.amount
            lines.append(
                {
                    "date": m.movement_date.isoformat(),
                    "code": m.code,
                    "description": m.notes or m.get_movement_type_display(),
                    "debit": str(debit),
                    "credit": str(credit),
                    "balance": str(running.quantize(Decimal("0.01"))),
                    "status": m.status,
                }
            )
        return _statement_result(
            entity_type, entity_id, entity_name, d_from, d_to, opening, total_in, total_out, running, lines
        )

    if entity_type == "card_merchant":
        acc = (
            CardMerchantAccount.objects.using(_USING)
            .select_related("card_network", "bank_account")
            .get(pk=entity_id, is_active=True)
        )
        entity_name = f"{acc.name_ar} ({acc.card_network.name_ar})"
        opening = acc.opening_balance
        running = opening
        qs = CardTransaction.objects.using(_USING).filter(card_merchant_account=acc).order_by(
            "transaction_date", "created_at"
        )
        if d_from:
            qs = qs.filter(transaction_date__gte=d_from)
        if d_to:
            qs = qs.filter(transaction_date__lte=d_to)
        if d_from:
            prior_settled = CardTransaction.objects.using(_USING).filter(
                card_merchant_account=acc,
                status=CardTransaction.Status.SETTLED,
                transaction_date__lt=d_from,
            ).aggregate(total=models.Sum("amount"))["total"] or Decimal("0")
            running = opening + prior_settled
            opening = running
        for tx in qs:
            if tx.status == CardTransaction.Status.SETTLED:
                total_in += tx.amount
                running += tx.amount
                lines.append(
                    {
                        "date": tx.transaction_date.isoformat(),
                        "code": tx.code,
                        "description": f"{tx.transaction_number} — {tx.get_status_display()}",
                        "debit": str(tx.amount),
                        "credit": "0",
                        "balance": str(running.quantize(Decimal("0.01"))),
                        "status": tx.status,
                    }
                )
            elif tx.status == CardTransaction.Status.PENDING:
                lines.append(
                    {
                        "date": tx.transaction_date.isoformat(),
                        "code": tx.code,
                        "description": f"{tx.transaction_number} — معلق (لم يُسوّى)",
                        "debit": str(tx.amount),
                        "credit": "0",
                        "balance": str(running.quantize(Decimal("0.01"))),
                        "status": tx.status,
                    }
                )
        pending = _card_pending(acc.pk)
        return {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity_name,
            "date_from": d_from.isoformat() if d_from else None,
            "date_to": d_to.isoformat(),
            "opening_balance": str(opening.quantize(Decimal("0.01"))),
            "total_in": str(total_in.quantize(Decimal("0.01"))),
            "total_out": str(total_out.quantize(Decimal("0.01"))),
            "closing_balance": str(running.quantize(Decimal("0.01"))),
            "pending_balance": str(pending.quantize(Decimal("0.01"))),
            "lines": lines,
        }

    if entity_type == "e_wallet":
        acc = (
            EWalletAccount.objects.using(_USING)
            .select_related("provider")
            .get(pk=entity_id, is_active=True)
        )
        entity_name = f"{acc.name_ar} ({acc.provider.name_ar})"
        opening = acc.opening_balance
        qs = (
            EWalletMovement.objects.using(_USING)
            .filter(e_wallet_account=acc, status=EWalletMovement.Status.POSTED)
            .order_by("movement_date", "created_at")
        )
        if d_from:
            qs = qs.filter(movement_date__gte=d_from)
        if d_to:
            qs = qs.filter(movement_date__lte=d_to)
        running = opening
        if d_from:
            prior = EWalletMovement.objects.using(_USING).filter(
                e_wallet_account=acc,
                status=EWalletMovement.Status.POSTED,
                movement_date__lt=d_from,
            )
            for m in prior:
                if m.movement_type in _WALLET_INFLOW:
                    running += m.amount
                else:
                    running -= m.amount
            opening = running
        for m in qs:
            is_in = m.movement_type in _WALLET_INFLOW
            debit = m.amount if is_in else Decimal("0")
            credit = m.amount if not is_in else Decimal("0")
            if is_in:
                total_in += m.amount
                running += m.amount
            else:
                total_out += m.amount
                running -= m.amount
            lines.append(
                {
                    "date": m.movement_date.isoformat(),
                    "code": m.code,
                    "description": m.notes or m.get_movement_type_display(),
                    "debit": str(debit),
                    "credit": str(credit),
                    "balance": str(running.quantize(Decimal("0.01"))),
                    "status": m.status,
                }
            )
        return _statement_result(
            entity_type, entity_id, entity_name, d_from, d_to, opening, total_in, total_out, running, lines
        )

    raise ValidationError("نوع كشف الحساب غير معروف.")


def _statement_result(
    entity_type,
    entity_id,
    entity_name,
    d_from,
    d_to,
    opening,
    total_in,
    total_out,
    running,
    lines,
) -> dict:
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "date_from": d_from.isoformat() if d_from else None,
        "date_to": d_to.isoformat(),
        "opening_balance": str(opening.quantize(Decimal("0.01"))),
        "total_in": str(total_in.quantize(Decimal("0.01"))),
        "total_out": str(total_out.quantize(Decimal("0.01"))),
        "closing_balance": str(running.quantize(Decimal("0.01"))),
        "lines": lines,
    }
