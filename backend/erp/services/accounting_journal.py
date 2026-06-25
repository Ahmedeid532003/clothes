"""دفتر القيود اليومية — إنشاء، اعتماد، ترحيل."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.accounting_models import GlAccount, JournalEntry, JournalLine
from erp.services import catalog as catalog_service
from erp.services.accounting_treasury import _audit

_USING = "tenant"
_QUANT = Decimal("0.01")


def _validate_balance(lines: list[dict]):
    total_d = Decimal("0")
    total_c = Decimal("0")
    for ln in lines:
        d = Decimal(str(ln.get("debit") or 0))
        c = Decimal(str(ln.get("credit") or 0))
        if d < 0 or c < 0:
            raise ValidationError("قيم المدين والدائن يجب أن تكون موجبة.")
        if d > 0 and c > 0:
            raise ValidationError("السطر لا يمكن أن يكون مديناً ودائناً معاً.")
        if d == 0 and c == 0:
            raise ValidationError("كل سطر يحتاج مبلغ مدين أو دائن.")
        total_d += d
        total_c += c
    if total_d.quantize(_QUANT) != total_c.quantize(_QUANT):
        raise ValidationError(
            f"القيد غير متوازن — مدين {total_d} ≠ دائن {total_c}."
        )
    if total_d <= 0:
        raise ValidationError("مجموع القيد يجب أن يكون أكبر من صفر.")
    return total_d, total_c


def _serialize_entry(j: JournalEntry) -> dict:
    lines = [
        {
            "id": str(ln.pk),
            "gl_account": str(ln.gl_account_id),
            "gl_account_code": ln.gl_account.code,
            "gl_account_name": ln.gl_account.name_ar,
            "debit": str(ln.debit),
            "credit": str(ln.credit),
            "memo": ln.memo,
            "line_order": ln.line_order,
        }
        for ln in j.lines.select_related("gl_account").order_by("line_order")
    ]
    return {
        "id": str(j.pk),
        "code": j.code,
        "entry_date": j.entry_date.isoformat(),
        "description": j.description,
        "status": j.status,
        "entry_kind": j.entry_kind,
        "source_type": j.source_type,
        "branch": str(j.branch_id) if j.branch_id else None,
        "branch_name": (
            (j.branch.name_ar or j.branch.code) if getattr(j, "branch", None) else None
        ),
        "cost_center": str(j.cost_center_id) if j.cost_center_id else None,
        "total_debit": str(j.total_debit),
        "total_credit": str(j.total_credit),
        "is_balanced": j.total_debit == j.total_credit,
        "posted_at": j.posted_at.isoformat() if j.posted_at else None,
        "approved_at": j.approved_at.isoformat() if j.approved_at else None,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "lines": lines,
    }


def list_journal_entries(*, status: str | None = None, from_date=None, to_date=None) -> list[dict]:
    qs = (
        JournalEntry.objects.using(_USING)
        .select_related("branch", "cost_center")
        .prefetch_related("lines__gl_account")
        .order_by("-entry_date", "-created_at")[:300]
    )
    if status:
        qs = qs.filter(status=status)
    if from_date:
        qs = qs.filter(entry_date__gte=from_date)
    if to_date:
        qs = qs.filter(entry_date__lte=to_date)
    return [_serialize_entry(j) for j in qs]


def get_journal_entry(entry_id) -> dict:
    j = (
        JournalEntry.objects.using(_USING)
        .select_related("branch", "cost_center")
        .prefetch_related("lines__gl_account")
        .get(pk=entry_id)
    )
    return _serialize_entry(j)


@transaction.atomic(using=_USING)
def create_journal_entry(*, data: dict, user) -> JournalEntry:
    lines = data.get("lines") or []
    if len(lines) < 2:
        raise ValidationError("القيد يحتاج سطرين على الأقل (مدين ودائن).")
    total_d, total_c = _validate_balance(lines)

    code = catalog_service._next_code("JE", JournalEntry)
    entry = JournalEntry.objects.using(_USING).create(
        code=code,
        entry_date=data["entry_date"],
        description=(data.get("description") or "").strip() or code,
        status=JournalEntry.Status.DRAFT,
        entry_kind=JournalEntry.EntryKind.MANUAL,
        branch_id=data.get("branch") or None,
        cost_center_id=data.get("cost_center") or None,
        currency_id=data.get("currency") or None,
        total_debit=total_d,
        total_credit=total_c,
        created_by=user,
    )
    for i, ln in enumerate(lines):
        gl = GlAccount.objects.using(_USING).get(pk=ln["gl_account"], is_active=True)
        JournalLine.objects.using(_USING).create(
            journal=entry,
            gl_account=gl,
            debit=Decimal(str(ln.get("debit") or 0)),
            credit=Decimal(str(ln.get("credit") or 0)),
            line_order=i + 1,
            memo=(ln.get("memo") or "").strip(),
            cost_center_id=ln.get("cost_center") or entry.cost_center_id,
        )
    _audit(
        action="journal_create",
        entity_type="journal_entry",
        entity_id=entry.pk,
        entity_code=entry.code,
        user=user,
        details={"debit": str(total_d), "credit": str(total_c)},
    )
    return entry


@transaction.atomic(using=_USING)
def update_journal_entry(entry_id, *, data: dict, user) -> JournalEntry:
    entry = JournalEntry.objects.using(_USING).select_for_update().get(pk=entry_id)
    if entry.status != JournalEntry.Status.DRAFT:
        raise ValidationError("لا يمكن تعديل قيد معتمد أو مرحّل.")
    if entry.entry_kind == JournalEntry.EntryKind.SYSTEM:
        raise ValidationError("لا يمكن تعديل قيد آلي من النظام.")

    if "description" in data:
        entry.description = (data["description"] or "").strip()
    if "entry_date" in data:
        entry.entry_date = data["entry_date"]
    if "branch" in data:
        entry.branch_id = data["branch"] or None
    if "cost_center" in data:
        entry.cost_center_id = data["cost_center"] or None

    if "lines" in data:
        lines = data["lines"]
        total_d, total_c = _validate_balance(lines)
        entry.lines.using(_USING).all().delete()
        for i, ln in enumerate(lines):
            gl = GlAccount.objects.using(_USING).get(pk=ln["gl_account"], is_active=True)
            JournalLine.objects.using(_USING).create(
                journal=entry,
                gl_account=gl,
                debit=Decimal(str(ln.get("debit") or 0)),
                credit=Decimal(str(ln.get("credit") or 0)),
                line_order=i + 1,
                memo=(ln.get("memo") or "").strip(),
                cost_center_id=ln.get("cost_center") or entry.cost_center_id,
            )
        entry.total_debit = total_d
        entry.total_credit = total_c

    entry.save(using=_USING)
    return entry


@transaction.atomic(using=_USING)
def approve_journal_entry(entry_id, user) -> JournalEntry:
    entry = JournalEntry.objects.using(_USING).select_for_update().get(pk=entry_id)
    if entry.status != JournalEntry.Status.DRAFT:
        raise ValidationError("لا يمكن اعتماد هذا القيد.")
    if entry.total_debit != entry.total_credit:
        raise ValidationError("القيد غير متوازن.")
    entry.status = JournalEntry.Status.APPROVED
    entry.approved_by = user
    entry.approved_at = timezone.now()
    entry.save(using=_USING, update_fields=["status", "approved_by", "approved_at"])
    _audit(
        action="journal_approve",
        entity_type="journal_entry",
        entity_id=entry.pk,
        entity_code=entry.code,
        user=user,
        details={},
    )
    return entry


@transaction.atomic(using=_USING)
def post_journal_entry(entry_id, user) -> JournalEntry:
    entry = JournalEntry.objects.using(_USING).select_for_update().get(pk=entry_id)
    if entry.status not in (JournalEntry.Status.DRAFT, JournalEntry.Status.APPROVED):
        raise ValidationError("لا يمكن ترحيل هذا القيد.")
    if entry.total_debit != entry.total_credit:
        raise ValidationError("القيد غير متوازن.")
    entry.status = JournalEntry.Status.POSTED
    entry.posted_at = timezone.now()
    if not entry.approved_by:
        entry.approved_by = user
        entry.approved_at = timezone.now()
    entry.save(
        using=_USING,
        update_fields=["status", "posted_at", "approved_by", "approved_at"],
    )
    _audit(
        action="journal_post",
        entity_type="journal_entry",
        entity_id=entry.pk,
        entity_code=entry.code,
        user=user,
        details={"amount": str(entry.total_debit)},
    )
    return entry


@transaction.atomic(using=_USING)
def void_journal_entry(entry_id, user) -> JournalEntry:
    entry = JournalEntry.objects.using(_USING).select_for_update().get(pk=entry_id)
    if entry.status == JournalEntry.Status.VOID:
        raise ValidationError("القيد ملغى مسبقاً.")
    if entry.status == JournalEntry.Status.POSTED:
        raise ValidationError("لا يمكن حذف قيد مرحّل — استخدم إلغاء القيد (عكسي لاحقاً).")
    entry.status = JournalEntry.Status.VOID
    entry.save(using=_USING, update_fields=["status"])
    return entry


@transaction.atomic(using=_USING)
def delete_journal_entry(entry_id) -> None:
    entry = JournalEntry.objects.using(_USING).select_for_update().get(pk=entry_id)
    if entry.status == JournalEntry.Status.POSTED:
        raise ValidationError("منع حذف القيود المرحّلة.")
    if entry.entry_kind == JournalEntry.EntryKind.SYSTEM:
        raise ValidationError("لا يمكن حذف قيد نظام.")
    entry.delete()
