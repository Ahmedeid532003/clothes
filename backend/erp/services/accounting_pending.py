"""الورديات المعلقة — مراقبة وإشعارات ومنع فتح وردية جديدة."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from erp.accounting_models import AccountingSettings, CashShift, ShiftHandover

_USING = "tenant"


def _serialize_pending_shift(s: CashShift, *, issue: str, severity: str) -> dict:
    emp = s.employee
    return {
        "id": str(s.pk),
        "code": s.code,
        "employee": str(s.employee_id),
        "employee_name": (emp.full_name or emp.username) if emp else "",
        "branch_name": (s.branch.name_ar or s.branch.code) if s.branch else "",
        "treasury_name": s.treasury.name_ar if s.treasury else "",
        "status": s.status,
        "handover_status": s.handover_status,
        "opened_at": s.opened_at.isoformat() if s.opened_at else None,
        "difference": str(s.difference),
        "expected_balance": str(s.expected_balance),
        "issue": issue,
        "severity": severity,
    }


def list_pending_shifts() -> dict:
    settings = AccountingSettings.objects.using(_USING).get_or_create(pk=1)[0]
    stale_before = timezone.now() - timedelta(hours=settings.stale_shift_hours)
    now = timezone.now()

    items: list[dict] = []
    counts = {
        "open": 0,
        "deficit": 0,
        "unapproved": 0,
        "stale": 0,
        "no_handover": 0,
        "total": 0,
    }

    qs = (
        CashShift.objects.using(_USING)
        .select_related("employee", "branch", "treasury")
        .exclude(status=CashShift.Status.APPROVED)
        .order_by("-opened_at")[:100]
    )

    for s in qs:
        if s.status == CashShift.Status.OPEN:
            counts["open"] += 1
            items.append(_serialize_pending_shift(s, issue="open", severity="info"))
            if s.opened_at and s.opened_at < stale_before:
                counts["stale"] += 1
                items.append(
                    _serialize_pending_shift(s, issue="stale", severity="critical")
                )
        elif s.status == CashShift.Status.CLOSED:
            counts["unapproved"] += 1
            items.append(_serialize_pending_shift(s, issue="unapproved", severity="warning"))
            if s.difference and s.difference < 0:
                counts["deficit"] += 1
                items.append(_serialize_pending_shift(s, issue="deficit", severity="critical"))
            elif s.difference and s.difference > 0:
                items.append(_serialize_pending_shift(s, issue="surplus", severity="warning"))
            if s.handover_status == "none":
                counts["no_handover"] += 1
                items.append(
                    _serialize_pending_shift(s, issue="no_handover", severity="warning")
                )

    pending_handovers = ShiftHandover.objects.using(_USING).filter(
        status__in=[
            ShiftHandover.Status.PENDING_REVIEW,
            ShiftHandover.Status.SENDER_SIGNED,
        ]
    ).count()

    counts["total"] = len({i["id"] for i in items})
    return {
        "counts": counts,
        "pending_handovers": pending_handovers,
        "block_new_shift": settings.block_new_shift_if_pending and counts["total"] > 0,
        "notifications": _build_notifications(counts, pending_handovers, now),
        "items": items,
    }


def _build_notifications(counts: dict, pending_handovers: int, now) -> list[dict]:
    notes = []
    if counts["stale"]:
        notes.append(
            {
                "level": "critical",
                "message_ar": f"{counts['stale']} وردية مفتوحة منذ فترة طويلة (انقطاع محتمل).",
                "message_en": f"{counts['stale']} stale open shift(s).",
            }
        )
    if counts["deficit"]:
        notes.append(
            {
                "level": "critical",
                "message_ar": f"{counts['deficit']} وردية بها عجز مالي.",
                "message_en": f"{counts['deficit']} shift(s) with cash deficit.",
            }
        )
    if counts["unapproved"]:
        notes.append(
            {
                "level": "warning",
                "message_ar": f"{counts['unapproved']} وردية مغلقة بانتظار اعتماد المدير.",
                "message_en": f"{counts['unapproved']} shift(s) awaiting approval.",
            }
        )
    if counts["no_handover"]:
        notes.append(
            {
                "level": "warning",
                "message_ar": f"{counts['no_handover']} وردية لم يُسلّم عهدتها.",
                "message_en": f"{counts['no_handover']} shift(s) without handover.",
            }
        )
    if pending_handovers:
        notes.append(
            {
                "level": "info",
                "message_ar": f"{pending_handovers} تسليم عهدة بانتظار الإجراء.",
                "message_en": f"{pending_handovers} handover(s) pending.",
            }
        )
    return notes


def assert_can_open_shift(user) -> None:
    from rest_framework.exceptions import ValidationError

    settings = AccountingSettings.objects.using(_USING).get_or_create(pk=1)[0]
    if not settings.block_new_shift_if_pending:
        return

    data = list_pending_shifts()
    if not data["block_new_shift"]:
        return

    my_pending = [
        i
        for i in data["items"]
        if i["employee"] == str(user.pk)
        and i["issue"] in ("open", "unapproved", "no_handover", "deficit")
    ]
    if my_pending:
        raise ValidationError(
            "لديك وردية معلقة — أغلقها أو سلّم العهدة أو اطلب اعتماد الإدارة قبل فتح وردية جديدة."
        )

    if data["counts"]["total"] > 0 and getattr(user, "is_owner", False):
        return

    if data["counts"]["stale"] or data["counts"]["deficit"]:
        raise ValidationError(
            "يوجد ورديات معلقة على مستوى الشركة — راجع شاشة الورديات المعلقة."
        )


def force_approve_shift(shift_id, user) -> CashShift:
    from django.db import transaction

    from erp.services import accounting_vouchers as shift_svc

    with transaction.atomic(using=_USING):
        shift = CashShift.objects.using(_USING).select_for_update().get(pk=shift_id)
        if shift.status == CashShift.Status.OPEN:
            shift.status = CashShift.Status.CLOSED
            shift.actual_balance = shift.expected_balance
            shift.difference = Decimal("0")
            shift.closed_at = timezone.now()
            shift.closed_by = user
            shift.save(
                using=_USING,
                update_fields=[
                    "status",
                    "actual_balance",
                    "difference",
                    "closed_at",
                    "closed_by",
                ],
            )
        if shift.status == CashShift.Status.CLOSED:
            return shift_svc.approve_cash_shift(shift_id, user)
        return shift
