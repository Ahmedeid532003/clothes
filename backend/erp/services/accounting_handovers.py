"""استلام الورديات — تسليم العهدة بين الموظفين."""

from __future__ import annotations

import hashlib
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.accounting_models import CashShift, ShiftHandover
from erp.services import accounting_treasury as treasury_service
from erp.services import catalog as catalog_service

_USING = "tenant"


def _signature(user, handover_id, role: str) -> str:
    raw = f"{user.pk}:{handover_id}:{role}:{timezone.now().isoformat()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _user_label(u) -> str:
    return (u.full_name or u.username) if u else ""


def _serialize_handover(h: ShiftHandover) -> dict:
    return {
        "id": str(h.pk),
        "code": h.code,
        "from_shift": str(h.from_shift_id),
        "from_shift_code": h.from_shift.code if h.from_shift else "",
        "to_shift": str(h.to_shift_id) if h.to_shift_id else None,
        "from_employee": str(h.from_employee_id),
        "from_employee_name": _user_label(h.from_employee),
        "to_employee": str(h.to_employee_id),
        "to_employee_name": _user_label(h.to_employee),
        "treasury": str(h.treasury_id),
        "treasury_name": h.treasury.name_ar if h.treasury else "",
        "branch": str(h.branch_id),
        "branch_name": (
            (h.branch.name_ar or h.branch.name_en or h.branch.code) if h.branch else ""
        ),
        "expected_balance": str(h.expected_balance),
        "actual_balance": str(h.actual_balance) if h.actual_balance is not None else None,
        "received_balance": str(h.received_balance) if h.received_balance is not None else None,
        "difference": str(h.difference),
        "difference_reason": h.difference_reason,
        "status": h.status,
        "requires_review": h.requires_review,
        "mandatory_count_done": h.mandatory_count_done,
        "sender_signed_at": h.sender_signed_at.isoformat() if h.sender_signed_at else None,
        "receiver_signed_at": h.receiver_signed_at.isoformat() if h.receiver_signed_at else None,
        "created_at": h.created_at.isoformat() if h.created_at else None,
        "completed_at": h.completed_at.isoformat() if h.completed_at else None,
    }


def list_handovers(*, status: str | None = None) -> list[dict]:
    qs = (
        ShiftHandover.objects.using(_USING)
        .select_related(
            "from_shift",
            "to_shift",
            "from_employee",
            "to_employee",
            "treasury",
            "branch",
        )
        .order_by("-created_at")[:200]
    )
    if status:
        qs = qs.filter(status=status)
    return [_serialize_handover(h) for h in qs]


def get_handover(handover_id) -> dict:
    h = (
        ShiftHandover.objects.using(_USING)
        .select_related(
            "from_shift",
            "to_shift",
            "from_employee",
            "to_employee",
            "treasury",
            "branch",
        )
        .get(pk=handover_id)
    )
    return _serialize_handover(h)


@transaction.atomic(using=_USING)
def create_handover(*, data: dict, user) -> ShiftHandover:
    shift = (
        CashShift.objects.using(_USING)
        .select_related("employee", "treasury", "branch")
        .get(pk=data["from_shift"])
    )
    if shift.status != CashShift.Status.CLOSED:
        raise ValidationError("يجب إغلاق الوردية قبل التسليم.")
    if shift.handover_status != "none":
        raise ValidationError("تم تسجيل تسليم لهذه الوردية مسبقاً.")
    if shift.employee_id != user.pk and not getattr(user, "is_owner", False):
        raise ValidationError("فقط صاحب الوردية يمكنه بدء التسليم.")

    if shift.actual_balance is None:
        raise ValidationError("الجرد الإجباري غير مكتمل — أغلق الوردية بالرصيد الفعلي أولاً.")

    to_user_id = data["to_employee"]
    if str(to_user_id) == str(shift.employee_id):
        raise ValidationError("لا يمكن التسليم لنفس الموظف.")

    code = catalog_service._next_code("HND", ShiftHandover)
    handover = ShiftHandover.objects.using(_USING).create(
        code=code,
        from_shift=shift,
        from_employee=shift.employee,
        to_employee_id=to_user_id,
        treasury=shift.treasury,
        branch=shift.branch,
        expected_balance=shift.expected_balance,
        actual_balance=shift.actual_balance,
        difference=shift.difference,
        difference_reason=(data.get("difference_reason") or shift.notes or "").strip(),
        status=ShiftHandover.Status.DRAFT,
        requires_review=shift.difference != 0,
        mandatory_count_done=True,
        created_by=user,
    )
    shift.handover_status = "pending"
    shift.save(using=_USING, update_fields=["handover_status"])

    treasury_service._audit(
        action="handover_create",
        entity_type="shift_handover",
        entity_id=handover.pk,
        entity_code=handover.code,
        user=user,
        details={"to": str(to_user_id), "amount": str(shift.actual_balance)},
    )
    return handover


@transaction.atomic(using=_USING)
def sign_sender(handover_id, user) -> ShiftHandover:
    h = ShiftHandover.objects.using(_USING).select_for_update().get(pk=handover_id)
    if h.from_employee_id != user.pk:
        raise ValidationError("التوقيع للمسلّم فقط.")
    if h.status not in (ShiftHandover.Status.DRAFT, ShiftHandover.Status.PENDING_REVIEW):
        raise ValidationError("لا يمكن التوقيع في هذه الحالة.")
    h.sender_signed_at = timezone.now()
    h.sender_signature = _signature(user, h.pk, "sender")
    h.status = ShiftHandover.Status.SENDER_SIGNED
    h.save(
        using=_USING,
        update_fields=["sender_signed_at", "sender_signature", "status"],
    )
    treasury_service._audit(
        action="handover_sign_sender",
        entity_type="shift_handover",
        entity_id=h.pk,
        entity_code=h.code,
        user=user,
        details={"signature": h.sender_signature[:16]},
    )
    return h


@transaction.atomic(using=_USING)
def receive_handover(handover_id, *, data: dict, user) -> ShiftHandover:
    from erp.accounting_models import AccountingSettings

    h = (
        ShiftHandover.objects.using(_USING)
        .select_for_update()
        .select_related("from_shift", "treasury", "branch")
        .get(pk=handover_id)
    )
    if h.to_employee_id != user.pk:
        raise ValidationError("الاستلام للموظف المستلم فقط.")
    if h.status != ShiftHandover.Status.SENDER_SIGNED:
        raise ValidationError("يلزم توقيع المسلّم أولاً.")

    received = Decimal(str(data["received_balance"]))
    h.received_balance = received
    h.difference = received - (h.actual_balance or Decimal("0"))
    h.difference_reason = (data.get("difference_reason") or h.difference_reason or "").strip()
    h.mandatory_count_done = True
    h.receiver_signed_at = timezone.now()
    h.receiver_signature = _signature(user, h.pk, "receiver")

    settings = AccountingSettings.objects.using(_USING).get_or_create(pk=1)[0]
    if h.difference != 0 and settings.handover_requires_review_on_diff:
        if not h.difference_reason:
            raise ValidationError("سبب الفرق مطلوب عند وجود عجز أو زيادة.")
        h.requires_review = True
        h.status = ShiftHandover.Status.PENDING_REVIEW
    else:
        h.requires_review = False
        h.status = ShiftHandover.Status.RECEIVED

    h.save(
        using=_USING,
        update_fields=[
            "received_balance",
            "difference",
            "difference_reason",
            "mandatory_count_done",
            "receiver_signed_at",
            "receiver_signature",
            "requires_review",
            "status",
        ],
    )
    treasury_service._audit(
        action="handover_receive",
        entity_type="shift_handover",
        entity_id=h.pk,
        entity_code=h.code,
        user=user,
        details={"received": str(received), "diff": str(h.difference)},
    )
    return h


@transaction.atomic(using=_USING)
def approve_handover(handover_id, user) -> ShiftHandover:
    h = ShiftHandover.objects.using(_USING).select_for_update().get(pk=handover_id)
    if h.status != ShiftHandover.Status.PENDING_REVIEW:
        raise ValidationError("لا يوجد مراجعة معلقة.")
    h.status = ShiftHandover.Status.RECEIVED
    h.reviewed_by = user
    h.reviewed_at = timezone.now()
    h.save(using=_USING, update_fields=["status", "reviewed_by", "reviewed_at"])
    treasury_service._audit(
        action="handover_approve",
        entity_type="shift_handover",
        entity_id=h.pk,
        entity_code=h.code,
        user=user,
        details={},
    )
    return h


@transaction.atomic(using=_USING)
def complete_handover(handover_id, user) -> ShiftHandover:
    h = (
        ShiftHandover.objects.using(_USING)
        .select_for_update()
        .select_related("from_shift", "treasury", "branch")
        .get(pk=handover_id)
    )
    if h.status not in (ShiftHandover.Status.RECEIVED, ShiftHandover.Status.PENDING_REVIEW):
        raise ValidationError("الاستلام غير مكتمل أو بانتظار المراجعة.")
    if h.requires_review and h.status == ShiftHandover.Status.PENDING_REVIEW:
        raise ValidationError("منع الاستلام بدون مراجعة الإدارة — اعتمد التسليم أولاً.")

    opening = h.received_balance or h.actual_balance or Decimal("0")
    to_code = catalog_service._next_code("SHF", CashShift)
    to_shift = CashShift.objects.using(_USING).create(
        code=to_code,
        employee_id=h.to_employee_id,
        branch=h.branch,
        treasury=h.treasury,
        opening_balance=opening,
        expected_balance=opening,
        status=CashShift.Status.OPEN,
    )
    h.to_shift = to_shift
    h.status = ShiftHandover.Status.COMPLETED
    h.completed_at = timezone.now()
    h.save(using=_USING, update_fields=["to_shift", "status", "completed_at"])

    from_shift = h.from_shift
    from_shift.handover_status = "completed"
    from_shift.save(using=_USING, update_fields=["handover_status"])

    treasury_service._audit(
        action="handover_complete",
        entity_type="shift_handover",
        entity_id=h.pk,
        entity_code=h.code,
        user=user,
        details={"new_shift": to_shift.code, "opening": str(opening)},
    )
    return h
