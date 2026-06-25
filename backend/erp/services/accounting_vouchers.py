"""أذونات المصروفات العامة، الورديات، والقيود المحاسبية."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.accounting_models import (
    AccountingSettings,
    CashShift,
    ExpenseVoucherAttachment,
    GeneralExpenseType,
    GeneralExpenseVoucher,
    GlAccount,
    JournalEntry,
    JournalLine,
    ShiftMovement,
    Treasury,
    TreasuryMovement,
)
from erp.services import catalog as catalog_service

_USING = "tenant"


def _settings() -> AccountingSettings:
    row, _ = AccountingSettings.objects.using(_USING).get_or_create(pk=1)
    return row


def ensure_default_treasuries():
    """خزائن افتراضية مرتبطة بحسابات أصول."""
    cash_gl, _ = GlAccount.objects.using(_USING).get_or_create(
        code="1100",
        defaults={
            "name_ar": "الخزنة النقدية",
            "name_en": "Cash on hand",
            "account_type": GlAccount.AccountType.ASSET,
            "is_active": True,
        },
    )
    bank_gl, _ = GlAccount.objects.using(_USING).get_or_create(
        code="1110",
        defaults={
            "name_ar": "البنك",
            "name_en": "Bank",
            "account_type": GlAccount.AccountType.ASSET,
            "is_active": True,
        },
    )
    Treasury.objects.using(_USING).get_or_create(
        code="TR-CASH",
        defaults={
            "name_ar": "خزنة رئيسية",
            "name_en": "Main cash",
            "kind": Treasury.TreasuryKind.CASH,
            "gl_account": cash_gl,
            "is_active": True,
        },
    )
    Treasury.objects.using(_USING).get_or_create(
        code="TR-BANK",
        defaults={
            "name_ar": "حساب بنكي",
            "name_en": "Bank account",
            "kind": Treasury.TreasuryKind.BANK,
            "gl_account": bank_gl,
            "is_active": True,
        },
    )
    ew_gl, _ = GlAccount.objects.using(_USING).get_or_create(
        code="1120",
        defaults={
            "name_ar": "محفظة إلكترونية",
            "name_en": "E-Wallet",
            "account_type": GlAccount.AccountType.ASSET,
            "is_active": True,
        },
    )
    Treasury.objects.using(_USING).get_or_create(
        code="TR-EWALLET",
        defaults={
            "name_ar": "محفظة إلكترونية",
            "name_en": "E-Wallet",
            "kind": Treasury.TreasuryKind.E_WALLET,
            "gl_account": ew_gl,
            "is_active": True,
        },
    )


def list_treasuries() -> list[dict]:
    ensure_default_treasuries()
    return [
        {
            "id": str(t.pk),
            "code": t.code,
            "name_ar": t.name_ar,
            "name_en": t.name_en,
            "kind": t.kind,
            "gl_account": str(t.gl_account_id),
            "gl_account_code": t.gl_account.code,
            "branch": str(t.branch_id) if t.branch_id else None,
            "branch_name": (
                (t.branch.name_ar or t.branch.name_en or t.branch.code) if t.branch else None
            ),
        }
        for t in Treasury.objects.using(_USING)
        .select_related("gl_account", "branch")
        .filter(is_active=True)
        .order_by("code")
    ]


def _calc_total(amount: Decimal, tax: Decimal) -> Decimal:
    return amount + tax


def _serialize_voucher(v: GeneralExpenseVoucher) -> dict:
    et = v.expense_type
    return {
        "id": str(v.pk),
        "code": v.code,
        "voucher_date": v.voucher_date.isoformat(),
        "expense_type": str(v.expense_type_id),
        "expense_type_code": et.code if et else "",
        "expense_type_name": et.name_ar if et else "",
        "amount": str(v.amount),
        "tax_amount": str(v.tax_amount),
        "total_amount": str(v.total_amount),
        "payment_method": v.payment_method,
        "treasury": str(v.treasury_id),
        "treasury_name": v.treasury.name_ar if v.treasury else "",
        "branch": str(v.branch_id) if v.branch_id else None,
        "branch_name": (
            (v.branch.name_ar or v.branch.name_en or v.branch.code) if v.branch else None
        ),
        "cost_center": str(v.cost_center_id) if v.cost_center_id else None,
        "cost_center_name": v.cost_center.name_ar if v.cost_center else None,
        "beneficiary": v.beneficiary,
        "supplier": str(v.supplier_id) if v.supplier_id else None,
        "supplier_name": v.supplier.name_ar if v.supplier else None,
        "responsible": str(v.responsible_id) if v.responsible_id else None,
        "responsible_name": (
            (v.responsible.full_name or v.responsible.username) if v.responsible else None
        ),
        "status": v.status,
        "requires_manager_review": v.requires_manager_review,
        "notes": v.notes,
        "journal_code": v.journal_entry.code if v.journal_entry else None,
        "attachments": [
            {
                "id": str(a.pk),
                "name": a.original_name or a.file.name,
                "url": a.file.url if a.file else "",
            }
            for a in v.attachments.all()
        ],
        "created_at": v.created_at.isoformat() if v.created_at else None,
        "approved_at": v.approved_at.isoformat() if v.approved_at else None,
        "posted_at": v.posted_at.isoformat() if v.posted_at else None,
    }


def list_expense_vouchers(*, status: str | None = None) -> list[dict]:
    qs = (
        GeneralExpenseVoucher.objects.using(_USING)
        .select_related(
            "expense_type",
            "treasury",
            "branch",
            "cost_center",
            "supplier",
            "responsible",
            "journal_entry",
        )
        .prefetch_related("attachments")
        .order_by("-voucher_date", "-created_at")[:300]
    )
    if status:
        qs = qs.filter(status=status)
    return [_serialize_voucher(v) for v in qs]


def _open_shift_for_user(user, treasury_id) -> CashShift | None:
    return (
        CashShift.objects.using(_USING)
        .filter(
            employee_id=user.pk,
            treasury_id=treasury_id,
            status=CashShift.Status.OPEN,
        )
        .first()
    )


@transaction.atomic(using=_USING)
def create_expense_voucher(*, data: dict, user, files=None) -> GeneralExpenseVoucher:
    amount = Decimal(str(data["amount"]))
    tax = Decimal(str(data.get("tax_amount") or 0))
    if amount <= 0:
        raise ValidationError("قيمة المصروف يجب أن تكون أكبر من صفر.")
    if tax < 0:
        raise ValidationError("قيمة الضريبة غير صالحة.")

    et = (
        GeneralExpenseType.objects.using(_USING)
        .select_related("gl_account")
        .get(pk=data["expense_type"], is_active=True)
    )
    treasury = Treasury.objects.using(_USING).select_related("gl_account").get(
        pk=data["treasury"], is_active=True
    )

    code = (data.get("code") or "").strip() or catalog_service._next_code(
        "GEV", GeneralExpenseVoucher
    )
    total = _calc_total(amount, tax)
    limit = _settings().expense_approval_limit
    needs_review = total > limit

    shift = _open_shift_for_user(user, treasury.pk)
    voucher = GeneralExpenseVoucher.objects.using(_USING).create(
        code=code,
        voucher_date=data["voucher_date"],
        expense_type=et,
        amount=amount,
        tax_amount=tax,
        total_amount=total,
        payment_method=data.get("payment_method", GeneralExpenseVoucher.PaymentMethod.CASH),
        treasury=treasury,
        branch_id=data.get("branch") or None,
        cost_center_id=data.get("cost_center") or et.cost_center_id or None,
        beneficiary=(data.get("beneficiary") or "").strip(),
        supplier_id=data.get("supplier") or None,
        responsible_id=data.get("responsible") or user.pk,
        cash_shift=shift,
        status=GeneralExpenseVoucher.Status.DRAFT,
        requires_manager_review=needs_review,
        notes=(data.get("notes") or "").strip(),
        created_by=user,
    )
    _save_attachments(voucher, files)
    return voucher


def _save_attachments(voucher: GeneralExpenseVoucher, files):
    if not files:
        return
    for f in files:
        ExpenseVoucherAttachment.objects.using(_USING).create(
            voucher=voucher,
            file=f,
            original_name=getattr(f, "name", "") or "",
        )


@transaction.atomic(using=_USING)
def update_expense_voucher(voucher_id, *, data: dict, user, files=None) -> GeneralExpenseVoucher:
    voucher = (
        GeneralExpenseVoucher.objects.using(_USING)
        .select_for_update()
        .get(pk=voucher_id)
    )
    if voucher.status != GeneralExpenseVoucher.Status.DRAFT:
        raise ValidationError("لا يمكن تعديل إذن معتمد أو مرحّل.")

    if "amount" in data:
        voucher.amount = Decimal(str(data["amount"]))
    if "tax_amount" in data:
        voucher.tax_amount = Decimal(str(data.get("tax_amount") or 0))
    voucher.total_amount = _calc_total(voucher.amount, voucher.tax_amount)
    limit = _settings().expense_approval_limit
    voucher.requires_manager_review = voucher.total_amount > limit

    for field in (
        "voucher_date",
        "payment_method",
        "beneficiary",
        "notes",
    ):
        if field in data:
            setattr(voucher, field, data[field])

    fk_map = {
        "expense_type": "expense_type_id",
        "treasury": "treasury_id",
        "branch": "branch_id",
        "cost_center": "cost_center_id",
        "supplier": "supplier_id",
        "responsible": "responsible_id",
    }
    for key, attr in fk_map.items():
        if key in data:
            setattr(voucher, attr, data[key] or None)

    voucher.save(using=_USING)
    _save_attachments(voucher, files)
    return voucher


@transaction.atomic(using=_USING)
def approve_expense_voucher(voucher_id, user) -> GeneralExpenseVoucher:
    voucher = (
        GeneralExpenseVoucher.objects.using(_USING)
        .select_for_update()
        .select_related("expense_type", "treasury")
        .get(pk=voucher_id)
    )
    if voucher.status != GeneralExpenseVoucher.Status.DRAFT:
        raise ValidationError("لا يمكن اعتماد هذا الإذن.")
    voucher.status = GeneralExpenseVoucher.Status.APPROVED
    voucher.approved_by = user
    voucher.approved_at = timezone.now()
    voucher.save(using=_USING, update_fields=["status", "approved_by", "approved_at"])
    return voucher


@transaction.atomic(using=_USING)
def post_expense_voucher(voucher_id, user) -> GeneralExpenseVoucher:
    voucher = (
        GeneralExpenseVoucher.objects.using(_USING)
        .select_for_update()
        .select_related("expense_type__gl_account", "treasury__gl_account", "cash_shift")
        .get(pk=voucher_id)
    )
    if voucher.status != GeneralExpenseVoucher.Status.APPROVED:
        raise ValidationError("يجب اعتماد الإذن قبل الترحيل.")
    if voucher.requires_manager_review and not getattr(user, "is_owner", False):
        raise ValidationError(
            "المبلغ يتجاوز الحد المالي — يلزم مراجعة المدير قبل الترحيل."
        )

    expense_gl = voucher.expense_type.gl_account
    if not expense_gl:
        raise ValidationError("نوع المصروف غير مربوط بحساب مالي — عرّف الحساب أولاً.")

    treasury_gl = voucher.treasury.gl_account
    je_code = catalog_service._next_code("JE", JournalEntry)
    journal = JournalEntry.objects.using(_USING).create(
        code=je_code,
        entry_date=voucher.voucher_date,
        description=f"مصروف عام — {voucher.code} — {voucher.expense_type.name_ar}",
        status=JournalEntry.Status.POSTED,
        entry_kind=JournalEntry.EntryKind.SYSTEM,
        source_type="expense_voucher",
        source_id=voucher.pk,
        total_debit=voucher.total_amount,
        total_credit=voucher.total_amount,
        posted_at=timezone.now(),
        approved_by=user,
        approved_at=timezone.now(),
        created_by=user,
    )
    JournalLine.objects.using(_USING).create(
        journal=journal,
        gl_account=expense_gl,
        debit=voucher.total_amount,
        credit=Decimal("0"),
        line_order=1,
        memo=voucher.beneficiary or voucher.expense_type.name_ar,
    )
    JournalLine.objects.using(_USING).create(
        journal=journal,
        gl_account=treasury_gl,
        debit=Decimal("0"),
        credit=voucher.total_amount,
        line_order=2,
        memo=voucher.treasury.name_ar,
    )

    voucher.status = GeneralExpenseVoucher.Status.POSTED
    voucher.journal_entry = journal
    voucher.posted_by = user
    voucher.posted_at = timezone.now()
    voucher.save(
        using=_USING,
        update_fields=["status", "journal_entry", "posted_by", "posted_at"],
    )

    if voucher.cash_shift_id and voucher.payment_method == GeneralExpenseVoucher.PaymentMethod.CASH:
        _add_shift_movement(
            voucher.cash_shift,
            ShiftMovement.MovementType.EXPENSE,
            voucher.total_amount,
            voucher.code,
            voucher,
        )
        _recalc_shift_expected(voucher.cash_shift_id)

    return voucher


@transaction.atomic(using=_USING)
def cancel_expense_voucher(voucher_id) -> GeneralExpenseVoucher:
    voucher = GeneralExpenseVoucher.objects.using(_USING).select_for_update().get(pk=voucher_id)
    if voucher.status in (
        GeneralExpenseVoucher.Status.POSTED,
        GeneralExpenseVoucher.Status.CANCELLED,
    ):
        raise ValidationError("لا يمكن إلغاء هذا الإذن.")
    voucher.status = GeneralExpenseVoucher.Status.CANCELLED
    voucher.save(using=_USING, update_fields=["status"])
    return voucher


def _money(amount: Decimal) -> str:
    return str(amount.quantize(Decimal("0.01")))


def _shift_movement_summary(shift: CashShift) -> dict:
    totals: dict[str, Decimal] = {}
    for m in shift.movements.all():
        totals[m.movement_type] = totals.get(m.movement_type, Decimal("0")) + m.amount
    return {k: str(v.quantize(Decimal("0.01"))) for k, v in totals.items()}


def _flatten_report_snapshot(snapshot: dict | None) -> dict:
    snap = snapshot or {}
    sales = snap.get("sales") or {}
    adj = snap.get("adjustments") or {}
    general = snap.get("general_expenses") or {}
    supplier = snap.get("supplier_payments") or {}
    wages = snap.get("wages") or {}
    book = snap.get("net_cash") or snap.get("book_revenue") or "0"
    return {
        "sales_total": sales.get("total", "0"),
        "sales_credit": sales.get("credit", "0"),
        "sales_cash": sales.get("cash_and_down", "0"),
        "customer_returns": adj.get("customer_returns", "0"),
        "down_payment_refunds": adj.get("down_payment_refunds", "0"),
        "installment_collections": adj.get("installment_collections", "0"),
        "total_cash_shift": snap.get("total_cash_shift", "0"),
        "general_expenses": general.get("total", "0"),
        "supplier_payments": supplier.get("total", "0"),
        "wages": wages.get("total", "0"),
        "book_revenue": book,
    }


def _employee_pending_totals() -> dict[str, str]:
    rows = (
        CashShift.objects.using(_USING)
        .filter(
            handover_status="pending",
            status__in=[CashShift.Status.CLOSED, CashShift.Status.APPROVED],
        )
        .values("employee_id")
        .annotate(total=Sum("actual_balance"))
    )
    return {str(r["employee_id"]): _money(r["total"] or Decimal("0")) for r in rows}


def _serialize_shift(
    s: CashShift,
    *,
    include_movements: bool = False,
    employee_pending: dict[str, str] | None = None,
) -> dict:
    emp = s.employee
    closed_by = s.closed_by
    approved_by = s.approved_by
    received_by = s.received_by
    received_treasury = s.received_treasury
    data = {
        "id": str(s.pk),
        "code": s.code,
        "employee": str(s.employee_id),
        "employee_name": (emp.full_name or emp.username) if emp else "",
        "branch": str(s.branch_id),
        "branch_name": (s.branch.name_ar or s.branch.name_en or s.branch.code) if s.branch else "",
        "treasury": str(s.treasury_id),
        "treasury_name": s.treasury.name_ar if s.treasury else "",
        "status": s.status,
        "opened_at": s.opened_at.isoformat() if s.opened_at else None,
        "closed_at": s.closed_at.isoformat() if s.closed_at else None,
        "opening_balance": str(s.opening_balance),
        "expected_balance": str(s.expected_balance),
        "actual_balance": str(s.actual_balance) if s.actual_balance is not None else None,
        "difference": str(s.difference),
        "notes": s.notes,
        "approved_at": s.approved_at.isoformat() if s.approved_at else None,
        "handover_status": s.handover_status,
        "closed_by_name": (closed_by.full_name or closed_by.username) if closed_by else "",
        "approved_by_name": (approved_by.full_name or approved_by.username) if approved_by else "",
        "movement_summary": _shift_movement_summary(s),
        "handover_receipt_code": s.handover_receipt_code or "",
        "received_by_name": (received_by.full_name or received_by.username) if received_by else "",
        "received_at": s.received_at.isoformat() if s.received_at else None,
        "received_treasury_name": received_treasury.name_ar if received_treasury else "",
        "employee_pending_balance": (employee_pending or {}).get(str(s.employee_id), "0"),
        **_flatten_report_snapshot(s.report_snapshot),
    }
    if include_movements:
        data["movements"] = [
            {
                "id": str(m.pk),
                "movement_type": m.movement_type,
                "amount": str(m.amount),
                "reference": m.reference,
                "notes": m.notes,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in s.movements.all()
        ]
    return data


def list_cash_shifts(
    *,
    status: str | None = None,
    branch_id: str | None = None,
    employee_id: str | None = None,
    handover_status: str | None = None,
    q: str | None = None,
) -> list[dict]:
    maybe_auto_close_shifts()
    qs = (
        CashShift.objects.using(_USING)
        .select_related(
            "employee",
            "branch",
            "treasury",
            "closed_by",
            "approved_by",
            "received_by",
            "received_treasury",
        )
        .prefetch_related("movements")
        .order_by("-opened_at")[:300]
    )
    if status:
        qs = qs.filter(status=status)
    if branch_id:
        qs = qs.filter(branch_id=branch_id)
    if employee_id:
        qs = qs.filter(employee_id=employee_id)
    if handover_status:
        qs = qs.filter(handover_status=handover_status)
    rows = [_serialize_shift(s, employee_pending=_employee_pending_totals()) for s in qs]
    if q:
        needle = q.strip().lower()
        if needle:
            rows = [
                r
                for r in rows
                if needle in " ".join(
                    [
                        r.get("code") or "",
                        r.get("employee_name") or "",
                        r.get("branch_name") or "",
                        r.get("treasury_name") or "",
                        r.get("notes") or "",
                    ]
                ).lower()
            ]
    return rows


def get_cash_shift(shift_id, *, sync_sales: bool = True) -> dict:
    s = (
        CashShift.objects.using(_USING)
        .select_related(
            "employee",
            "branch",
            "treasury",
            "closed_by",
            "approved_by",
            "received_by",
            "received_treasury",
        )
        .prefetch_related("movements")
        .get(pk=shift_id)
    )
    if sync_sales and s.status == CashShift.Status.OPEN:
        sync_shift_from_sales(s)
        s.refresh_from_db(using=_USING)
    return _serialize_shift(s, include_movements=True)


def get_my_open_shift(user) -> dict | None:
    shift = (
        CashShift.objects.using(_USING)
        .select_related("employee", "branch", "treasury", "closed_by", "approved_by")
        .prefetch_related("movements")
        .filter(employee_id=user.pk, status=CashShift.Status.OPEN)
        .first()
    )
    return _serialize_shift(shift, include_movements=False) if shift else None


@transaction.atomic(using=_USING)
def open_cash_shift(*, data: dict, user) -> CashShift:
    from erp.services.accounting_pending import assert_can_open_shift

    assert_can_open_shift(user)
    if (
        CashShift.objects.using(_USING)
        .filter(employee_id=user.pk, status=CashShift.Status.OPEN)
        .exists()
    ):
        raise ValidationError("لديك وردية مفتوحة بالفعل — أغلقها أولاً.")

    opening = Decimal(str(data.get("opening_balance") or 0))
    treasury = Treasury.objects.using(_USING).get(pk=data["treasury"], is_active=True)
    code = catalog_service._next_code("SHF", CashShift)
    return CashShift.objects.using(_USING).create(
        code=code,
        employee=user,
        branch_id=data["branch"],
        treasury=treasury,
        opening_balance=opening,
        expected_balance=opening,
        status=CashShift.Status.OPEN,
        report_snapshot={},
    )


def _add_shift_movement(shift, mtype, amount: Decimal, reference: str, voucher):
    ShiftMovement.objects.using(_USING).create(
        shift=shift,
        movement_type=mtype,
        amount=amount,
        reference=reference,
        expense_voucher=voucher,
    )


def _recalc_shift_expected(shift_id):
    shift = CashShift.objects.using(_USING).get(pk=shift_id)
    balance = shift.opening_balance
    for m in shift.movements.using(_USING).all():
        if m.movement_type in (
            ShiftMovement.MovementType.SALE,
            ShiftMovement.MovementType.COLLECTION,
            ShiftMovement.MovementType.TRANSFER_IN,
        ):
            balance += m.amount
        elif m.movement_type in (
            ShiftMovement.MovementType.RETURN,
            ShiftMovement.MovementType.EXPENSE,
            ShiftMovement.MovementType.TRANSFER_OUT,
        ):
            balance -= m.amount
    shift.expected_balance = balance
    shift.save(using=_USING, update_fields=["expected_balance"])


@transaction.atomic(using=_USING)
def close_cash_shift(shift_id, *, data: dict, user) -> CashShift:
    shift = CashShift.objects.using(_USING).select_for_update().get(pk=shift_id)
    if shift.status != CashShift.Status.OPEN:
        raise ValidationError("الوردية ليست مفتوحة.")
    if shift.employee_id != user.pk and not getattr(user, "is_owner", False):
        raise ValidationError("لا يمكنك إغلاق وردية موظف آخر.")

    sync_shift_from_sales(shift)
    shift.refresh_from_db(using=_USING)

    actual = Decimal(str(data.get("actual_balance") or 0))
    _recalc_shift_expected(shift.pk)
    shift.refresh_from_db(using=_USING)
    report = get_shift_daily_report(shift.pk)
    book = Decimal(str(report.get("net_cash") or 0))
    shift.actual_balance = actual
    shift.difference = actual - book
    shift.report_snapshot = report
    shift.status = CashShift.Status.CLOSED
    shift.closed_at = timezone.now()
    shift.closed_by = user
    shift.notes = (data.get("notes") or shift.notes or "").strip()
    shift.handover_status = "pending"
    shift.save(
        using=_USING,
        update_fields=[
            "actual_balance",
            "difference",
            "report_snapshot",
            "status",
            "closed_at",
            "closed_by",
            "notes",
            "handover_status",
        ],
    )
    return shift


@transaction.atomic(using=_USING)
def approve_cash_shift(shift_id, user) -> CashShift:
    shift = CashShift.objects.using(_USING).select_for_update().get(pk=shift_id)
    if shift.status != CashShift.Status.CLOSED:
        raise ValidationError("يجب إغلاق الوردية قبل الاعتماد.")
    shift.status = CashShift.Status.APPROVED
    shift.approved_by = user
    shift.approved_at = timezone.now()
    shift.save(using=_USING, update_fields=["status", "approved_by", "approved_at"])
    return shift


def get_open_shift_for_user(user) -> CashShift | None:
    return (
        CashShift.objects.using(_USING)
        .filter(employee_id=user.pk, status=CashShift.Status.OPEN)
        .first()
    )


def link_sale_to_open_shift(user, sale) -> CashShift | None:
    """ربط فاتورة POS بوردية المستخدم المفتوحة."""
    shift = get_open_shift_for_user(user)
    if not shift:
        return None
    if sale.cash_shift_id != shift.pk:
        sale.cash_shift = shift
        sale.save(using=_USING, update_fields=["cash_shift"])
    return shift


def record_shift_movement_on_shift(
    shift: CashShift | None,
    movement_type: str,
    amount: Decimal,
    *,
    reference: str = "",
    notes: str = "",
) -> None:
    """تسجيل حركة على وردية محددة (أدق من البحث بالمستخدم)."""
    if not shift or amount <= 0:
        return
    _add_shift_movement(shift, movement_type, amount, reference, None)
    if notes:
        m = shift.movements.using(_USING).order_by("-created_at").first()
        if m:
            m.notes = notes[:300]
            m.save(using=_USING, update_fields=["notes"])
    _recalc_shift_expected(shift.pk)


def record_shift_movement_for_user(
    user,
    movement_type: str,
    amount: Decimal,
    *,
    reference: str = "",
    notes: str = "",
) -> CashShift | None:
    """تسجيل حركة على وردية المستخدم المفتوحة (بيع، مرتجع، تحصيل…)."""
    shift = get_open_shift_for_user(user)
    if not shift:
        return None
    record_shift_movement_on_shift(
        shift, movement_type, amount, reference=reference, notes=notes
    )
    return shift


def list_active_shift_users() -> list[dict]:
    qs = (
        CashShift.objects.using(_USING)
        .select_related("employee", "branch", "treasury")
        .filter(status=CashShift.Status.OPEN)
        .order_by("employee__full_name", "employee__username")
    )
    return [
        {
            "shift_id": str(s.pk),
            "shift_code": s.code,
            "employee_id": str(s.employee_id),
            "employee_name": (s.employee.full_name or s.employee.username) if s.employee else "",
            "branch_name": (s.branch.name_ar or s.branch.code) if s.branch else "",
            "treasury_name": s.treasury.name_ar if s.treasury else "",
            "opened_at": s.opened_at.isoformat() if s.opened_at else None,
            "expected_balance": str(s.expected_balance),
        }
        for s in qs
    ]


def maybe_auto_close_shifts() -> int:
    """إغلاق آلي للورديات المفتوحة من أيام سابقة فقط (نسيت الإغلاق)."""
    settings = _settings()
    if not settings.auto_close_enabled:
        return 0
    today = timezone.localtime().date()
    closed = 0
    qs = CashShift.objects.using(_USING).filter(status=CashShift.Status.OPEN)
    for shift in qs:
        if not shift.opened_at:
            continue
        opened_date = timezone.localtime(shift.opened_at).date()
        if opened_date >= today:
            continue
        _recalc_shift_expected(shift.pk)
        shift.refresh_from_db(using=_USING)
        shift.actual_balance = shift.expected_balance
        shift.difference = Decimal("0")
        shift.status = CashShift.Status.CLOSED
        shift.closed_at = timezone.now()
        shift.handover_status = "pending"
        note = "إغلاق آلي — وردية من يوم سابق"
        shift.notes = f"{shift.notes}\n{note}".strip() if shift.notes else note
        shift.save(
            using=_USING,
            update_fields=[
                "actual_balance",
                "difference",
                "status",
                "closed_at",
                "handover_status",
                "notes",
            ],
        )
        closed += 1
    return closed


def _resolve_chief_treasury(
    *, branch_id, override_id=None, exclude_id=None
) -> Treasury:
    if override_id:
        target = Treasury.objects.using(_USING).get(pk=override_id, is_active=True)
        if exclude_id and target.pk == exclude_id:
            raise ValidationError("خزينة الاستلام يجب أن تختلف عن خزينة الصندوق.")
        return target
    settings = _settings()
    if settings.chief_treasury_id and settings.chief_treasury_id != exclude_id:
        return Treasury.objects.using(_USING).get(pk=settings.chief_treasury_id, is_active=True)
    qs = Treasury.objects.using(_USING).filter(
        kind=Treasury.TreasuryKind.CASH,
        is_active=True,
    )
    if branch_id:
        branch_t = qs.filter(branch_id=branch_id).exclude(pk=exclude_id).order_by("code").first()
        if branch_t:
            return branch_t
    chief = qs.exclude(pk=exclude_id).order_by("code").first()
    if not chief:
        chief = (
            Treasury.objects.using(_USING)
            .filter(is_active=True)
            .exclude(pk=exclude_id)
            .order_by("code")
            .first()
        )
    if not chief:
        raise ValidationError("لا توجد خزينة مناسبة للاستلام — عرّف خزينة نقدية أخرى.")
    return chief


@transaction.atomic(using=_USING)
def receive_shift_cash(shift_id, *, data: dict, user) -> CashShift:
    from erp.permissions import can_use_feature
    from erp.services import accounting_treasury as treasury_service

    if not (
        getattr(user, "is_owner", False)
        or can_use_feature(user, "cash-shifts", "receive_treasury")
    ):
        raise ValidationError("ليس لديك صلاحية استلام مبلغ الوردية للخزينة.")

    shift = (
        CashShift.objects.using(_USING)
        .select_for_update()
        .select_related("treasury", "branch")
        .get(pk=shift_id)
    )
    if shift.status not in (CashShift.Status.CLOSED, CashShift.Status.APPROVED):
        raise ValidationError("يجب إغلاق الوردية قبل الاستلام.")
    if shift.handover_status != "pending":
        raise ValidationError("الوردية ليست بانتظار الاستلام.")

    amount = Decimal(str(shift.actual_balance or 0))
    if amount <= 0:
        raise ValidationError("لا يوجد مبلغ نقدي للاستلام.")

    target = _resolve_chief_treasury(
        branch_id=shift.branch_id,
        override_id=data.get("target_treasury"),
        exclude_id=shift.treasury_id,
    )

    emp_name = ""
    if shift.employee_id:
        emp = shift.employee
        emp_name = (emp.full_name or emp.username) if emp else ""

    movement = treasury_service.create_treasury_movement(
        data={
            "movement_date": timezone.localdate().isoformat(),
            "movement_type": TreasuryMovement.MovementType.RECEIPT,
            "treasury": str(target.pk),
            "amount": str(amount),
            "branch": str(shift.branch_id),
            "cash_shift": str(shift.pk),
            "notes": (
                f"استلام وردية {shift.code}"
                + (f" — {emp_name}" if emp_name else "")
                + (f" — صندوق {shift.treasury.code}" if shift.treasury else "")
            ),
        },
        user=user,
    )
    treasury_service.post_treasury_movement(movement.pk, user)

    shift.handover_status = "completed"
    shift.handover_receipt_code = movement.code
    shift.received_by = user
    shift.received_at = timezone.now()
    shift.received_treasury = target
    if shift.status == CashShift.Status.CLOSED:
        shift.status = CashShift.Status.APPROVED
        shift.approved_by = user
        shift.approved_at = timezone.now()
    shift.save(
        using=_USING,
        update_fields=[
            "handover_status",
            "handover_receipt_code",
            "received_by",
            "received_at",
            "received_treasury",
            "status",
            "approved_by",
            "approved_at",
        ],
    )
    return shift


def get_enterprise_cash_dashboard() -> dict:
    """أرصدة المنشأة النقدية — خزائن + ورديات."""
    from erp.services import accounting_treasury as treasury_service

    treasuries = treasury_service.list_treasury_balances()
    open_shift_treasuries = set(
        CashShift.objects.using(_USING)
        .filter(status=CashShift.Status.OPEN)
        .values_list("treasury_id", flat=True)
    )
    pending_shift_treasuries = set(
        CashShift.objects.using(_USING)
        .filter(
            handover_status="pending",
            status__in=[CashShift.Status.CLOSED, CashShift.Status.APPROVED],
        )
        .values_list("treasury_id", flat=True)
    )
    treasury_meta: dict[str, dict] = {}
    for s in CashShift.objects.using(_USING).filter(status=CashShift.Status.OPEN):
        tid = str(s.treasury_id)
        treasury_meta.setdefault(tid, {"open_shifts": 0, "pending_amount": Decimal("0")})
        treasury_meta[tid]["open_shifts"] += 1
    for s in CashShift.objects.using(_USING).filter(
        handover_status="pending",
        status__in=[CashShift.Status.CLOSED, CashShift.Status.APPROVED],
    ):
        tid = str(s.treasury_id)
        treasury_meta.setdefault(tid, {"open_shifts": 0, "pending_amount": Decimal("0")})
        treasury_meta[tid]["pending_amount"] += Decimal(str(s.actual_balance or 0))

    enriched_treasuries = []
    for t in treasuries:
        tid = str(t.get("id"))
        meta = treasury_meta.get(tid, {"open_shifts": 0, "pending_amount": Decimal("0")})
        bal = Decimal(str(t.get("balance") or 0))
        has_open = tid in open_shift_treasuries or meta["open_shifts"] > 0
        has_pending = tid in pending_shift_treasuries or meta["pending_amount"] > 0
        if bal == 0 and not has_open and not has_pending:
            continue
        enriched_treasuries.append(
            {
                **t,
                "open_shifts": meta["open_shifts"],
                "pending_amount": _money(meta["pending_amount"]),
                "has_open_shift": has_open,
                "has_pending_handover": has_pending,
            }
        )

    open_shifts = CashShift.objects.using(_USING).filter(status=CashShift.Status.OPEN).count()
    pending_shifts = (
        CashShift.objects.using(_USING)
        .filter(
            handover_status="pending",
            status__in=[CashShift.Status.CLOSED, CashShift.Status.APPROVED],
        )
        .count()
    )
    total_balance = sum((Decimal(str(t.get("balance") or 0)) for t in treasuries), Decimal("0"))
    pending_amount = (
        CashShift.objects.using(_USING)
        .filter(
            handover_status="pending",
            status__in=[CashShift.Status.CLOSED, CashShift.Status.APPROVED],
        )
        .aggregate(total=Sum("actual_balance"))
        .get("total")
        or Decimal("0")
    )
    user_balances = []
    pending_map = _employee_pending_totals()
    if pending_map:
        from erp.models import User

        users = User.objects.using(_USING).filter(pk__in=pending_map.keys())
        name_map = {str(u.pk): (u.full_name or u.username) for u in users}
        for emp_id, amt in pending_map.items():
            user_balances.append(
                {
                    "employee_id": emp_id,
                    "employee_name": name_map.get(emp_id, ""),
                    "pending_balance": amt,
                }
            )
        user_balances.sort(key=lambda x: Decimal(x["pending_balance"]), reverse=True)

    shift_rows = []
    for s in (
        CashShift.objects.using(_USING)
        .select_related("employee", "branch", "treasury", "received_by", "received_treasury")
        .filter(
            Q(status=CashShift.Status.OPEN)
            | Q(handover_status="pending", status__in=[CashShift.Status.CLOSED, CashShift.Status.APPROVED])
            | Q(handover_status="completed")
        )
        .order_by("-opened_at")[:300]
    ):
        bal = s.actual_balance if s.status != CashShift.Status.OPEN else s.expected_balance
        if Decimal(str(bal or 0)) == 0 and s.handover_status not in ("pending", "completed"):
            continue
        shift_rows.append(
            {
                "shift_id": str(s.pk),
                "shift_code": s.code,
                "employee_name": (s.employee.full_name or s.employee.username) if s.employee else "",
                "branch_name": (s.branch.name_ar or s.branch.code) if s.branch else "",
                "treasury_name": s.treasury.name_ar if s.treasury else "",
                "status": s.status,
                "handover_status": s.handover_status,
                "amount": _money(bal or Decimal("0")),
                "opened_at": s.opened_at.isoformat() if s.opened_at else None,
                "closed_at": s.closed_at.isoformat() if s.closed_at else None,
                "received_by_name": (s.received_by.full_name or s.received_by.username)
                if s.received_by
                else "",
                "received_treasury_name": s.received_treasury.name_ar if s.received_treasury else "",
                "handover_receipt_code": s.handover_receipt_code or "",
                "received_at": s.received_at.isoformat() if s.received_at else None,
            }
        )

    return {
        "total_balance": _money(total_balance),
        "open_shifts_count": open_shifts,
        "pending_shifts_count": pending_shifts,
        "open_treasuries_count": len(open_shift_treasuries),
        "pending_treasuries_count": len(pending_shift_treasuries),
        "pending_shifts_amount": _money(pending_amount),
        "treasuries": enriched_treasuries,
        "user_balances": user_balances,
        "active_shift_rows": shift_rows,
    }


def pos_requires_open_shift() -> bool:
    return bool(_settings().require_open_shift_for_pos)


def assert_pos_shift_open(user) -> CashShift:
    if not pos_requires_open_shift():
        return None  # type: ignore
    shift = get_open_shift_for_user(user)
    if not shift:
        raise ValidationError("يجب فتح وردية قبل استخدام نقطة البيع أو الصندوق.")
    return shift


def _is_payroll_expense_type(expense_type: GeneralExpenseType) -> bool:
    gl = expense_type.gl_account
    if gl and (gl.code or "").startswith("514"):
        return True
    label = (expense_type.name_ar or "").strip()
    return any(k in label for k in ("رواتب", "أجور", "مرتبات"))


def _group_voucher_lines(vouchers) -> tuple[Decimal, list[dict]]:
    buckets: dict[str, Decimal] = {}
    for voucher in vouchers:
        label = (
            (voucher.supplier.name_ar if voucher.supplier_id else None)
            or voucher.beneficiary
            or (voucher.expense_type.name_ar if voucher.expense_type_id else "")
            or voucher.code
        )
        buckets[label] = buckets.get(label, Decimal("0")) + voucher.total_amount
    total = sum(buckets.values(), Decimal("0"))
    items = [
        {"name": name, "amount": _money(amt)}
        for name, amt in sorted(buckets.items(), key=lambda x: (-x[1], x[0]))
        if amt > 0
    ]
    return total, items


def _cash_amount_for_sale(sale) -> Decimal:
    from erp.sale_models import Sale, SalePayment

    cash_methods = {
        Sale.PaymentMethod.CASH,
        Sale.PaymentMethod.CARD,
        Sale.PaymentMethod.WALLET,
    }
    pays = list(sale.payments.all())
    if pays:
        return sum(
            (p.amount or Decimal("0") for p in pays if p.payment_method in cash_methods),
            Decimal("0"),
        )
    if sale.payment_method in cash_methods:
        return sale.total or Decimal("0")
    return Decimal("0")


def sync_shift_from_sales(shift: CashShift) -> int:
    """ربط مبيعات الوردية وإنشاء حركات SALE الناقصة."""
    opened_at = shift.opened_at
    closed_at = shift.closed_at or timezone.now()
    sales_qs = _shift_sales_for_report(shift, opened_at, closed_at)
    existing_refs = {
        (m.reference or "").strip()
        for m in shift.movements.using(_USING).filter(
            movement_type=ShiftMovement.MovementType.SALE
        )
        if (m.reference or "").strip()
    }
    changed = 0
    for sale in sales_qs.prefetch_related("payments"):
        if sale.cash_shift_id != shift.pk:
            sale.cash_shift = shift
            sale.save(using=_USING, update_fields=["cash_shift"])
            changed += 1
        ref = (sale.code or "").strip()
        if not ref or ref in existing_refs:
            continue
        cash_amt = _cash_amount_for_sale(sale)
        if cash_amt <= 0:
            continue
        _add_shift_movement(
            shift,
            ShiftMovement.MovementType.SALE,
            cash_amt,
            ref,
            None,
        )
        existing_refs.add(ref)
        changed += 1
    if changed:
        _recalc_shift_expected(shift.pk)
    return changed


def _shift_sales_for_report(shift: CashShift, opened_at, closed_at):
    """مبيعات الوردية — بالربط المباشر ثم مراجع الحركات ثم نافذة الوقت."""
    from erp.sale_models import Sale

    linked = Sale.objects.using(_USING).filter(
        cash_shift_id=shift.pk,
        status=Sale.Status.COMPLETED,
    )
    if linked.exists():
        return linked

    codes = [
        m.reference
        for m in shift.movements.all()
        if m.movement_type == ShiftMovement.MovementType.SALE and (m.reference or "").strip()
    ]
    if codes:
        by_ref = Sale.objects.using(_USING).filter(
            code__in=codes,
            status=Sale.Status.COMPLETED,
        )
        if by_ref.exists():
            return by_ref

    return Sale.objects.using(_USING).filter(
        created_by_id=shift.employee_id,
        status=Sale.Status.COMPLETED,
        created_at__gte=opened_at,
        created_at__lte=closed_at,
    )


def _shift_cash_from_sales(sales_qs) -> Decimal:
    from erp.sale_models import Sale, SalePayment

    cash_methods = {
        Sale.PaymentMethod.CASH,
        Sale.PaymentMethod.CARD,
        Sale.PaymentMethod.WALLET,
    }
    total = Decimal("0")
    for sale in sales_qs.prefetch_related("payments"):
        pays = list(sale.payments.all())
        if pays:
            for p in pays:
                if p.payment_method in cash_methods:
                    total += p.amount or Decimal("0")
        elif sale.payment_method in cash_methods:
            total += sale.total or Decimal("0")
    return total


def get_shift_daily_report(shift_id) -> dict:
    """تقرير اليومية كاشير — تجميع المبيعات والتحصيل والمصروفات قبل حساب الصافي."""
    from erp.sale_models import Sale, SaleReturn

    shift = (
        CashShift.objects.using(_USING)
        .select_related("employee", "branch", "treasury")
        .prefetch_related("movements")
        .get(pk=shift_id)
    )
    if shift.status == CashShift.Status.OPEN:
        _recalc_shift_expected(shift.pk)
        shift.refresh_from_db(using=_USING)
    sync_shift_from_sales(shift)
    shift.refresh_from_db(using=_USING)
    opened_at = shift.opened_at
    closed_at = shift.closed_at or timezone.now()

    sales_qs = _shift_sales_for_report(shift, opened_at, closed_at)
    total_sales = sum((s.total for s in sales_qs), Decimal("0"))

    cash_and_down = Decimal("0")
    installment_collections = Decimal("0")
    customer_returns = Decimal("0")
    down_payment_refunds = Decimal("0")
    for movement in shift.movements.all():
        amt = movement.amount or Decimal("0")
        if movement.movement_type == ShiftMovement.MovementType.SALE:
            cash_and_down += amt
        elif movement.movement_type == ShiftMovement.MovementType.COLLECTION:
            installment_collections += amt
        elif movement.movement_type == ShiftMovement.MovementType.RETURN:
            note = (movement.notes or "").strip()
            if "مقدم" in note or "حجز" in note:
                down_payment_refunds += amt
            else:
                customer_returns += amt

    if cash_and_down <= 0 and total_sales > 0:
        cash_and_down = _shift_cash_from_sales(sales_qs)

    returns_qs = (
        SaleReturn.objects.using(_USING)
        .filter(
            status=SaleReturn.Status.POSTED,
            refund_method=SaleReturn.RefundMethod.CASH,
        )
        .filter(
            Q(cash_shift_id=shift.pk)
            | Q(
                created_by_id=shift.employee_id,
                created_at__gte=opened_at,
                created_at__lte=closed_at,
            )
        )
        .only("total", "down_payment_refund")
    )
    if returns_qs.exists():
        customer_returns = Decimal("0")
        down_payment_refunds = Decimal("0")
        for ret in returns_qs:
            refund_dp = ret.down_payment_refund or Decimal("0")
            down_payment_refunds += refund_dp
            customer_returns += max(ret.total - refund_dp, Decimal("0"))

    credit_sales = max(total_sales - cash_and_down, Decimal("0"))
    total_cash_shift = (
        cash_and_down - customer_returns - down_payment_refunds + installment_collections
    )

    expense_vouchers = (
        GeneralExpenseVoucher.objects.using(_USING)
        .select_related("expense_type__gl_account", "supplier")
        .filter(
            cash_shift_id=shift.pk,
            status=GeneralExpenseVoucher.Status.POSTED,
            payment_method=GeneralExpenseVoucher.PaymentMethod.CASH,
        )
    )
    general_vouchers = []
    supplier_vouchers = []
    payroll_vouchers = []
    for voucher in expense_vouchers:
        if voucher.supplier_id:
            supplier_vouchers.append(voucher)
        elif _is_payroll_expense_type(voucher.expense_type):
            payroll_vouchers.append(voucher)
        else:
            general_vouchers.append(voucher)

    general_total, general_items = _group_voucher_lines(general_vouchers)
    supplier_total, supplier_items = _group_voucher_lines(supplier_vouchers)
    wages_total, wages_items = _group_voucher_lines(payroll_vouchers)

    net_cash = total_cash_shift - general_total - supplier_total - wages_total
    emp = shift.employee

    return {
        "shift_id": str(shift.pk),
        "shift_code": shift.code,
        "employee_name": (emp.full_name or emp.username) if emp else "",
        "branch_name": (shift.branch.name_ar or shift.branch.code) if shift.branch else "",
        "treasury_name": shift.treasury.name_ar if shift.treasury else "",
        "opened_at": opened_at.isoformat() if opened_at else None,
        "closed_at": shift.closed_at.isoformat() if shift.closed_at else None,
        "opening_balance": _money(shift.opening_balance),
        "expected_balance": _money(shift.expected_balance),
        "sales": {
            "total": _money(total_sales),
            "credit": _money(credit_sales),
            "cash_and_down": _money(cash_and_down),
        },
        "adjustments": {
            "customer_returns": _money(customer_returns),
            "down_payment_refunds": _money(down_payment_refunds),
            "installment_collections": _money(installment_collections),
        },
        "total_cash_shift": _money(total_cash_shift),
        "general_expenses": {
            "total": _money(general_total),
            "items": general_items if general_total > 0 else [],
        },
        "supplier_payments": {
            "total": _money(supplier_total),
            "items": supplier_items if supplier_total > 0 else [],
        },
        "wages": {
            "total": _money(wages_total),
            "items": wages_items if wages_total > 0 else [],
        },
        "net_cash": _money(net_cash),
    }
