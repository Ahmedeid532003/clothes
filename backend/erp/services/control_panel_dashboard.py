"""لوحة التحكم الرئيسية — مؤشرات حقيقية من قاعدة البيانات."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

_USING = "tenant"
_MONEY = Decimal("0.01")
_POSTED_VOUCHER = ("posted", "approved")


def _money(value: Decimal) -> str:
    return str(value.quantize(_MONEY))


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _resolve_period(*, period: str | None, date_from: str | None, date_to: str | None) -> tuple[date, date, str]:
    today = timezone.localdate()
    key = (period or "today").strip().lower()
    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to)
    if d_from and d_to:
        return d_from, d_to, "custom"
    if key == "yesterday":
        d = today - timedelta(days=1)
        return d, d, "yesterday"
    if key == "week":
        return today - timedelta(days=6), today, "week"
    return today, today, "today"


def _sum_payments(*, d_from: date, d_to: date, method: str, branch_id: str | None = None) -> Decimal:
    from erp.sale_models import Sale, SalePayment

    qs = SalePayment.objects.using(_USING).filter(
        sale__status=Sale.Status.COMPLETED,
        sale__created_at__date__gte=d_from,
        sale__created_at__date__lte=d_to,
        payment_method=method,
    )
    if branch_id:
        qs = qs.filter(sale__branch_id=branch_id)
    return qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")


def _sum_returns(*, d_from: date, d_to: date, method: str, branch_id: str | None = None) -> Decimal:
    from erp.sale_models import SaleReturn

    refund_map = {
        "cash": SaleReturn.RefundMethod.CASH,
        "card": SaleReturn.RefundMethod.BANK,
        "wallet": SaleReturn.RefundMethod.WALLET,
        "credit": SaleReturn.RefundMethod.CUSTOMER_ACCOUNT,
        "installment": SaleReturn.RefundMethod.CUSTOMER_ACCOUNT,
        "reserved": SaleReturn.RefundMethod.CUSTOMER_ACCOUNT,
    }
    refund = refund_map.get(method)
    if not refund:
        return Decimal("0")
    qs = SaleReturn.objects.using(_USING).filter(
        status=SaleReturn.Status.POSTED,
        created_at__date__gte=d_from,
        created_at__date__lte=d_to,
        refund_method=refund,
    )
    if branch_id:
        qs = qs.filter(branch_id=branch_id)
    return qs.aggregate(total=Sum("total"))["total"] or Decimal("0")


def _kpi_block(*, d_from: date, d_to: date, method: str, branch_id: str | None = None) -> dict:
    sales = _sum_payments(d_from=d_from, d_to=d_to, method=method, branch_id=branch_id)
    returns = _sum_returns(d_from=d_from, d_to=d_to, method=method, branch_id=branch_id)
    net = sales - returns
    return {
        "net": _money(net),
        "sales": _money(sales),
        "returns": _money(returns),
    }


def _branch_sales(*, d_from: date, d_to: date) -> list[dict]:
    from erp.models import Branch
    from erp.sale_models import Sale, SaleReturn

    branches = list(Branch.objects.using(_USING).filter(is_active=True).order_by("code"))
    rows: list[dict] = []
    for br in branches:
        sales = (
            Sale.objects.using(_USING)
            .filter(
                branch_id=br.pk,
                status=Sale.Status.COMPLETED,
                created_at__date__gte=d_from,
                created_at__date__lte=d_to,
            )
            .aggregate(total=Sum("total"))["total"]
            or Decimal("0")
        )
        returns = (
            SaleReturn.objects.using(_USING)
            .filter(
                branch_id=br.pk,
                status=SaleReturn.Status.POSTED,
                created_at__date__gte=d_from,
                created_at__date__lte=d_to,
            )
            .aggregate(total=Sum("total"))["total"]
            or Decimal("0")
        )
        net = sales - returns
        if net <= 0 and sales <= 0:
            continue
        rows.append(
            {
                "branch_id": str(br.pk),
                "name": br.name_ar or br.name_en or br.code,
                "value": _money(net),
            }
        )
    rows.sort(key=lambda r: Decimal(r["value"]), reverse=True)
    max_val = max((Decimal(r["value"]) for r in rows), default=Decimal("0"))
    for row in rows:
        val = Decimal(row["value"])
        row["pct"] = int((val / max_val * 100).quantize(Decimal("1"))) if max_val > 0 else 0
    return rows


def _expense_totals(*, d_from: date, d_to: date) -> dict[str, Decimal]:
    from erp.accounting_models import GeneralExpenseVoucher, TreasuryMovement
    from erp.supplier_models import SupplierPayment

    totals = {
        "supplier_payments_cash": Decimal("0"),
        "salaries_advances": Decimal("0"),
        "general_expenses": Decimal("0"),
        "supplier_payments_chq": Decimal("0"),
        "bank_deposit": Decimal("0"),
        "owner_withdrawals": Decimal("0"),
        "owner_deposit_treasury": Decimal("0"),
        "paid_checks": Decimal("0"),
    }

    supplier_qs = SupplierPayment.objects.using(_USING).filter(
        status=SupplierPayment.Status.APPROVED,
        payment_date__gte=d_from,
        payment_date__lte=d_to,
    )
    for row in supplier_qs:
        if row.payment_method == SupplierPayment.PaymentMethod.CASH:
            totals["supplier_payments_cash"] += row.amount
        elif row.payment_method in (
            SupplierPayment.PaymentMethod.CHEQUE,
            SupplierPayment.PaymentMethod.PROMISSORY_NOTE,
            SupplierPayment.PaymentMethod.OTHER_PAPERS,
        ):
            totals["supplier_payments_chq"] += row.amount

    voucher_qs = (
        GeneralExpenseVoucher.objects.using(_USING)
        .select_related("expense_type")
        .filter(
            voucher_date__gte=d_from,
            voucher_date__lte=d_to,
            status__in=_POSTED_VOUCHER,
        )
    )
    for v in voucher_qs:
        name = (v.expense_type.name_ar or v.expense_type.name_en or "").lower()
        if any(k in name for k in ("راتب", "مرتب", "سلف", "payroll", "salary")):
            totals["salaries_advances"] += v.total_amount
        elif v.supplier_id:
            if v.payment_method == GeneralExpenseVoucher.PaymentMethod.CASH:
                totals["supplier_payments_cash"] += v.total_amount
            elif v.payment_method == GeneralExpenseVoucher.PaymentMethod.CHEQUE:
                totals["supplier_payments_chq"] += v.total_amount
        else:
            totals["general_expenses"] += v.total_amount

    tm_qs = TreasuryMovement.objects.using(_USING).filter(
        movement_date__gte=d_from,
        movement_date__lte=d_to,
        status=TreasuryMovement.Status.POSTED,
    )
    for m in tm_qs:
        if m.movement_type == TreasuryMovement.MovementType.DEPOSIT:
            totals["bank_deposit"] += m.amount
            totals["owner_deposit_treasury"] += m.amount
        elif m.movement_type == TreasuryMovement.MovementType.WITHDRAWAL:
            totals["owner_withdrawals"] += m.amount

    from erp.banking_models import Cheque

    paid = (
        Cheque.objects.using(_USING)
        .filter(
            status=Cheque.Status.PAID,
            paid_at__date__gte=d_from,
            paid_at__date__lte=d_to,
        )
        .aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )
    totals["paid_checks"] = paid
    return totals


def control_panel_dashboard(
    *,
    period: str | None = "today",
    date_from: str | None = None,
    date_to: str | None = None,
    branch_id: str | None = None,
) -> dict:
    d_from, d_to, period_key = _resolve_period(
        period=period, date_from=date_from, date_to=date_to
    )

    cash = _kpi_block(d_from=d_from, d_to=d_to, method="cash", branch_id=branch_id)
    credit = _kpi_block(d_from=d_from, d_to=d_to, method="credit", branch_id=branch_id)
    installment = _kpi_block(
        d_from=d_from, d_to=d_to, method="installment", branch_id=branch_id
    )
    reserved = _kpi_block(d_from=d_from, d_to=d_to, method="reserved", branch_id=branch_id)
    card = _kpi_block(d_from=d_from, d_to=d_to, method="card", branch_id=branch_id)
    wallet = _kpi_block(d_from=d_from, d_to=d_to, method="wallet", branch_id=branch_id)

    grand_net = sum(
        Decimal(x["net"])
        for x in (cash, credit, installment, reserved, card, wallet)
    )
    visa_wallets_net = Decimal(card["net"]) + Decimal(wallet["net"])
    total_revenue = grand_net

    expense_totals = _expense_totals(d_from=d_from, d_to=d_to)
    total_expenses = sum(expense_totals.values(), Decimal("0"))

    from erp.services import accounting_treasury as treasury_service

    treasuries = treasury_service.list_treasury_balances()
    treasury_cash = sum(
        (Decimal(str(t.get("balance") or 0)) for t in treasuries),
        Decimal("0"),
    )

    from erp.services.banking import list_bank_accounts

    bank_accounts = list_bank_accounts()
    banks = []
    bank_total = Decimal("0")
    for acc in bank_accounts[:8]:
        bal = Decimal(str(acc.get("current_balance") or 0))
        bank_total += bal
        banks.append(
            {
                "name": f"{acc.get('bank_name', '')} ({acc.get('name_ar', acc.get('code', ''))})".strip(),
                "balance": _money(bal),
            }
        )

    from erp.banking_models import Cheque
    from erp.accounting_models import CashShift
    from erp.hr_payroll_models import AttendanceRecord

    month_start = d_to.replace(day=1)
    checks_due = (
        Cheque.objects.using(_USING)
        .filter(
            direction=Cheque.Direction.PAYABLE,
            status=Cheque.Status.PENDING,
            due_date__gte=month_start,
            due_date__lte=d_to,
        )
        .aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )

    pending_shifts = []
    for s in (
        CashShift.objects.using(_USING)
        .select_related("employee")
        .filter(
            handover_status="pending",
            status__in=[CashShift.Status.CLOSED, CashShift.Status.APPROVED],
        )
        .order_by("-closed_at", "-opened_at")[:8]
    ):
        amt = s.actual_balance or Decimal("0")
        pending_shifts.append(
            {
                "cashier": (s.employee.full_name or s.employee.username) if s.employee else "—",
                "close_label": s.closed_at.isoformat() if s.closed_at else (s.opened_at.isoformat() if s.opened_at else ""),
                "amount": _money(amt),
                "tag": "pending",
                "live": s.status == CashShift.Status.OPEN,
            }
        )

    attendance = []
    for rec in (
        AttendanceRecord.objects.using(_USING)
        .select_related("employee")
        .filter(work_date=d_to)
        .order_by("employee__employee_code")[:12]
    ):
        emp = rec.employee
        status = "ok"
        if rec.late_minutes and rec.late_minutes > 0:
            status = "late"
        if not rec.check_in:
            status = "absent"
        attendance.append(
            {
                "name": emp.full_name or emp.username if emp else "—",
                "sub": emp.username if emp else "",
                "time": rec.check_in.strftime("%H:%M") if rec.check_in else "—",
                "delay": f"تأخير {rec.late_minutes} دقيقة"
                if rec.late_minutes
                else ("في الموعد" if rec.check_in else "غائب"),
                "status": status,
            }
        )

    return {
        "period": {
            "key": period_key,
            "date_from": d_from.isoformat(),
            "date_to": d_to.isoformat(),
        },
        "kpis": {
            "cash_sales": cash,
            "credit_advances": credit,
            "net_credit_sales": credit,
            "net_reservations": reserved,
            "installment_collections": installment,
            "grand_net": _money(grand_net),
        },
        "revenue": {
            "total": _money(total_revenue),
            "actual_cash": _money(Decimal(cash["net"])),
            "visa_wallets": _money(visa_wallets_net),
        },
        "expenses": {k: _money(v) for k, v in expense_totals.items()},
        "total_expenses": _money(total_expenses),
        "treasury": {
            "net_total": _money(treasury_cash),
            "cash_hand": _money(treasury_cash),
            "visa_wallets": _money(visa_wallets_net),
        },
        "branch_sales": _branch_sales(d_from=d_from, d_to=d_to),
        "pending_shifts": pending_shifts,
        "pending_shifts_count": len(pending_shifts),
        "banks": banks,
        "bank_total": _money(bank_total),
        "checks_due_month": _money(checks_due),
        "attendance": attendance,
    }
