"""حركة الصناديق والسيولة — أرصدة، تحويلات، تدقيق."""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.accounting_models import (
    AccountingSettings,
    Treasury,
    TreasuryAuditLog,
    TreasuryMovement,
)
from erp.services import catalog as catalog_service

_USING = "tenant"
_INFLOW = (
    TreasuryMovement.MovementType.RECEIPT,
    TreasuryMovement.MovementType.DEPOSIT,
)
_OUTFLOW = (
    TreasuryMovement.MovementType.PAYMENT,
    TreasuryMovement.MovementType.WITHDRAWAL,
)


def _settings() -> AccountingSettings:
    row, _ = AccountingSettings.objects.using(_USING).get_or_create(pk=1)
    return row


def _audit(*, action: str, entity_type: str, entity_id, entity_code: str, user, details: dict):
    TreasuryAuditLog.objects.using(_USING).create(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_code=entity_code,
        user=user,
        details=json.dumps(details, ensure_ascii=False, default=str),
    )


def treasury_balance(treasury_id) -> Decimal:
    posted = TreasuryMovement.objects.using(_USING).filter(
        status=TreasuryMovement.Status.POSTED
    )
    total = Decimal("0")
    for m in posted.filter(treasury_id=treasury_id):
        if m.movement_type in _INFLOW:
            total += m.amount
        elif m.movement_type in _OUTFLOW or m.movement_type == TreasuryMovement.MovementType.TRANSFER:
            total -= m.amount
    for m in posted.filter(
        counter_treasury_id=treasury_id,
        movement_type=TreasuryMovement.MovementType.TRANSFER,
    ):
        total += m.amount
    return total


def list_treasury_balances() -> list[dict]:
    from erp.services.accounting_vouchers import ensure_default_treasuries

    ensure_default_treasuries()
    rows = []
    for t in Treasury.objects.using(_USING).filter(is_active=True).order_by("code"):
        bal = treasury_balance(t.pk)
        rows.append(
            {
                "id": str(t.pk),
                "code": t.code,
                "name_ar": t.name_ar,
                "kind": t.kind,
                "balance": str(bal),
                "currency": "EGP",
            }
        )
    return rows


def _serialize_movement(m: TreasuryMovement) -> dict:
    return {
        "id": str(m.pk),
        "code": m.code,
        "movement_date": m.movement_date.isoformat(),
        "movement_type": m.movement_type,
        "treasury": str(m.treasury_id),
        "treasury_name": m.treasury.name_ar if m.treasury else "",
        "counter_treasury": str(m.counter_treasury_id) if m.counter_treasury_id else None,
        "counter_treasury_name": m.counter_treasury.name_ar if m.counter_treasury else None,
        "amount": str(m.amount),
        "currency": m.currency,
        "branch": str(m.branch_id) if m.branch_id else None,
        "branch_name": (
            (m.branch.name_ar or m.branch.name_en or m.branch.code) if m.branch else None
        ),
        "status": m.status,
        "balance_after": str(m.balance_after) if m.balance_after is not None else None,
        "notes": m.notes,
        "created_by_name": (
            (m.created_by.full_name or m.created_by.username) if m.created_by else None
        ),
        "posted_at": m.posted_at.isoformat() if m.posted_at else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def list_treasury_movements(*, status: str | None = None, treasury_id=None) -> list[dict]:
    qs = (
        TreasuryMovement.objects.using(_USING)
        .select_related("treasury", "counter_treasury", "branch", "created_by")
        .order_by("-movement_date", "-created_at")[:300]
    )
    if status:
        qs = qs.filter(status=status)
    if treasury_id:
        qs = qs.filter(Q(treasury_id=treasury_id) | Q(counter_treasury_id=treasury_id))
    return [_serialize_movement(m) for m in qs]


def list_audit_logs(*, limit: int = 100) -> list[dict]:
    return [
        {
            "id": str(a.pk),
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_code": a.entity_code,
            "user_name": (a.user.full_name or a.user.username) if a.user else None,
            "details": a.details,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in TreasuryAuditLog.objects.using(_USING)
        .select_related("user")
        .order_by("-created_at")[:limit]
    ]


@transaction.atomic(using=_USING)
def create_treasury_movement(*, data: dict, user) -> TreasuryMovement:
    amount = Decimal(str(data["amount"]))
    if amount <= 0:
        raise ValidationError("المبلغ يجب أن يكون أكبر من صفر.")

    mtype = data["movement_type"]
    treasury = Treasury.objects.using(_USING).get(pk=data["treasury"], is_active=True)
    counter = None
    if mtype == TreasuryMovement.MovementType.TRANSFER:
        if not data.get("counter_treasury"):
            raise ValidationError("حساب التحويل (إلى) مطلوب.")
        counter = Treasury.objects.using(_USING).get(pk=data["counter_treasury"], is_active=True)
        if counter.pk == treasury.pk:
            raise ValidationError("لا يمكن التحويل لنفس الحساب.")

    limit = _settings().user_transfer_limit
    needs_approval = amount > limit or mtype == TreasuryMovement.MovementType.TRANSFER

    code = catalog_service._next_code("TMV", TreasuryMovement)
    movement = TreasuryMovement.objects.using(_USING).create(
        code=code,
        movement_date=data["movement_date"],
        movement_type=mtype,
        treasury=treasury,
        counter_treasury=counter,
        amount=amount,
        currency=(data.get("currency") or "EGP").upper()[:3],
        branch_id=data.get("branch") or None,
        cash_shift_id=data.get("cash_shift") or None,
        status=(
            TreasuryMovement.Status.PENDING_APPROVAL
            if needs_approval
            else TreasuryMovement.Status.DRAFT
        ),
        notes=(data.get("notes") or "").strip(),
        created_by=user,
    )
    _audit(
        action="create",
        entity_type="treasury_movement",
        entity_id=movement.pk,
        entity_code=movement.code,
        user=user,
        details={"type": mtype, "amount": str(amount)},
    )
    return movement


@transaction.atomic(using=_USING)
def post_treasury_movement(movement_id, user) -> TreasuryMovement:
    movement = (
        TreasuryMovement.objects.using(_USING)
        .select_for_update(of=("self",))
        .select_related("treasury", "counter_treasury")
        .get(pk=movement_id)
    )
    if movement.status not in (
        TreasuryMovement.Status.DRAFT,
        TreasuryMovement.Status.PENDING_APPROVAL,
    ):
        raise ValidationError("لا يمكن ترحيل هذه الحركة.")

    tid = movement.treasury_id
    bal = treasury_balance(tid)
    if movement.movement_type in _OUTFLOW or movement.movement_type == TreasuryMovement.MovementType.TRANSFER:
        if bal < movement.amount:
            raise ValidationError(
                f"رصيد الحساب غير كافٍ. الرصيد الحالي: {bal}"
            )

    movement.status = TreasuryMovement.Status.POSTED
    movement.balance_after = bal + _movement_delta(movement, tid)
    movement.approved_by = user
    movement.posted_at = timezone.now()
    movement.save(
        using=_USING,
        update_fields=["status", "balance_after", "approved_by", "posted_at"],
    )

    if movement.movement_type == TreasuryMovement.MovementType.TRANSFER:
        _audit(
            action="transfer_out",
            entity_type="treasury_movement",
            entity_id=movement.pk,
            entity_code=movement.code,
            user=user,
            details={
                "from": movement.treasury.code,
                "to": movement.counter_treasury.code,
                "amount": str(movement.amount),
            },
        )
    else:
        _audit(
            action="post",
            entity_type="treasury_movement",
            entity_id=movement.pk,
            entity_code=movement.code,
            user=user,
            details={"balance_after": str(movement.balance_after)},
        )
    return movement


def _movement_delta(m: TreasuryMovement, treasury_id) -> Decimal:
    if m.treasury_id == treasury_id:
        if m.movement_type in _INFLOW:
            return m.amount
        if m.movement_type in _OUTFLOW or m.movement_type == TreasuryMovement.MovementType.TRANSFER:
            return -m.amount
    if m.counter_treasury_id == treasury_id and m.movement_type == TreasuryMovement.MovementType.TRANSFER:
        return m.amount
    return Decimal("0")


@transaction.atomic(using=_USING)
def cancel_treasury_movement(movement_id, user) -> TreasuryMovement:
    movement = TreasuryMovement.objects.using(_USING).select_for_update().get(pk=movement_id)
    if movement.status == TreasuryMovement.Status.POSTED:
        raise ValidationError("لا يمكن إلغاء حركة مرحّلة.")
    movement.status = TreasuryMovement.Status.CANCELLED
    movement.save(using=_USING, update_fields=["status"])
    _audit(
        action="cancel",
        entity_type="treasury_movement",
        entity_id=movement.pk,
        entity_code=movement.code,
        user=user,
        details={},
    )
    return movement
