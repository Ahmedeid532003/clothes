"""كشف حساب عميل — تفصيلي وحساب عام."""

from __future__ import annotations

from decimal import Decimal

from rest_framework.exceptions import ValidationError

from erp.customer_models import Customer
from erp.receivable_models import InstallmentContract, InstallmentPlanTemplate, ReceivableInvoice, ReceivablePayment
from erp.sale_models import CustomerReservation, Sale, SaleReturn

_USING = "tenant"
_MONEY = Decimal("0.01")


def _z(v: Decimal) -> str:
    return str(v.quantize(_MONEY))


def _empty_row() -> dict:
    return {
        "payment_system": "",
        "sales_amount": "0",
        "sales_interest": "0",
        "sales_total": "0",
        "returns_amount": "0",
        "returns_interest": "0",
        "returns_total": "0",
        "payment_reservation": "0",
        "payment_down": "0",
        "payment_installments": "0",
        "debit": "0",
        "credit": "0",
    }


def _freq_label(freq: str) -> str:
    labels = {
        InstallmentPlanTemplate.Frequency.WEEKLY: "أسبوع",
        InstallmentPlanTemplate.Frequency.BIWEEKLY: "أسبوعين",
        InstallmentPlanTemplate.Frequency.MONTHLY: "شهر",
    }
    return labels.get(freq, "شهر")


def _contract_for_sale(sale: Sale) -> InstallmentContract | None:
    ri = ReceivableInvoice.objects.using(_USING).filter(sale=sale).first()
    if not ri:
        return None
    return InstallmentContract.objects.using(_USING).filter(receivable=ri).first()


def _payment_system_label(sale: Sale, contract: InstallmentContract | None) -> str:
    if contract and contract.plan_id:
        freq = contract.plan.frequency if contract.plan else InstallmentPlanTemplate.Frequency.MONTHLY
        return f"تقسيط {contract.num_installments} {_freq_label(freq)}"
    if sale.payment_method == Sale.PaymentMethod.INSTALLMENT:
        return "تقسيط"
    if sale.payment_method == Sale.PaymentMethod.CREDIT:
        return "آجل"
    if sale.payment_method == Sale.PaymentMethod.RESERVED:
        return "حجز"
    if sale.payment_method == Sale.PaymentMethod.MIXED:
        return "مختلط"
    return "نقدي"


def _split_sale_payments(sale: Sale, contract: InstallmentContract | None) -> tuple[Decimal, Decimal, Decimal]:
    reservation = Decimal("0")
    down = Decimal("0")
    installments = Decimal("0")
    for pay in sale.payments.all():
        amount = Decimal(str(pay.amount or 0))
        if amount <= 0:
            continue
        method = pay.payment_method
        if method == Sale.PaymentMethod.RESERVED:
            reservation += amount
        elif method in (
            Sale.PaymentMethod.CASH,
            Sale.PaymentMethod.CARD,
            Sale.PaymentMethod.WALLET,
        ):
            down += amount
        elif method == Sale.PaymentMethod.INSTALLMENT:
            installments += amount
        elif method == Sale.PaymentMethod.CREDIT:
            pass
    if contract and contract.down_payment_amount > 0 and down == 0:
        down = contract.down_payment_amount
    return reservation, down, installments


def _row_delta(row: dict) -> Decimal:
    sales = Decimal(row.get("sales_total") or "0")
    returns = Decimal(row.get("returns_total") or "0")
    reservation = Decimal(row.get("payment_reservation") or "0")
    down = Decimal(row.get("payment_down") or "0")
    installments = Decimal(row.get("payment_installments") or "0")
    return sales - returns - reservation - down - installments


def _apply_debit_credit(row: dict) -> None:
    delta = _row_delta(row)
    if delta >= 0:
        row["debit"] = _z(delta)
        row["credit"] = "0"
    else:
        row["debit"] = "0"
        row["credit"] = _z(-delta)


def _sale_rows(*, customer_id, date_from, date_to) -> list[dict]:
    qs = (
        Sale.objects.using(_USING)
        .filter(customer_id=customer_id, status=Sale.Status.COMPLETED)
        .select_related("season", "customer")
        .prefetch_related("payments")
    )
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    rows: list[dict] = []
    for sale in qs.order_by("created_at"):
        contract = _contract_for_sale(sale)
        base = _empty_row()
        sales_amount = Decimal(str(sale.subtotal or 0))
        sales_interest = Decimal(str(contract.interest_amount if contract else 0))
        sales_total = sales_amount + sales_interest

        reservation, down, installments = _split_sale_payments(sale, contract)
        base["payment_system"] = _payment_system_label(sale, contract)
        base["sales_amount"] = _z(sales_amount)
        base["sales_interest"] = _z(sales_interest)
        base["sales_total"] = _z(sales_total)
        base["payment_reservation"] = _z(reservation)
        base["payment_down"] = _z(down)
        base["payment_installments"] = _z(installments)
        _apply_debit_credit(base)

        rows.append(
            {
                **base,
                "id": f"sl-{sale.id}",
                "date": sale.created_at.date().isoformat(),
                "document_code": sale.code,
                "season_id": str(sale.season_id),
                "season_name": sale.season.name_ar if sale.season_id else "",
                "transaction_type": "sale",
                "transaction_label": "فاتورة مبيعات",
                "notes": sale.notes or "",
                "source_type": "sale",
                "source_id": str(sale.id),
                "navigate_tab": "sales-invoices",
                "sort_key": f"{sale.created_at.date().isoformat()}|{sale.code}",
                "highlight": False,
            }
        )
    return rows


def _return_rows(*, customer_id, date_from, date_to) -> list[dict]:
    qs = (
        SaleReturn.objects.using(_USING)
        .filter(customer_id=customer_id, status=SaleReturn.Status.POSTED)
        .select_related("sale", "customer")
    )
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    rows: list[dict] = []
    for ret in qs.order_by("created_at"):
        base = _empty_row()
        goods = Decimal(str(ret.subtotal or 0))
        interest = Decimal(str(ret.return_interest or 0))
        refund = Decimal(str(ret.down_payment_refund or 0))
        returns_total = goods + interest

        base["returns_amount"] = _z(goods)
        base["returns_interest"] = _z(interest)
        base["returns_total"] = _z(returns_total)
        if refund > 0:
            base["payment_down"] = _z(-refund)
        _apply_debit_credit(base)

        notes = ret.notes or ret.reason or ""
        if refund > 0:
            notes = (notes + f" — مردود مقدم {refund} ج").strip(" —")

        rows.append(
            {
                **base,
                "id": f"sr-{ret.id}",
                "date": ret.created_at.date().isoformat(),
                "document_code": ret.code,
                "season_id": str(ret.sale.season_id) if ret.sale_id else "",
                "season_name": ret.sale.season.name_ar if ret.sale_id and ret.sale.season_id else "",
                "transaction_type": "sale_return",
                "transaction_label": "فاتورة مرتجع",
                "notes": notes,
                "source_type": "sale_return",
                "source_id": str(ret.id),
                "navigate_tab": "sales-returns",
                "sort_key": f"{ret.created_at.date().isoformat()}|{ret.code}",
                "highlight": refund > 0,
            }
        )
    return rows


def _reservation_rows(*, customer_id, date_from, date_to) -> list[dict]:
    qs = (
        CustomerReservation.objects.using(_USING)
        .filter(customer_id=customer_id)
        .exclude(status=CustomerReservation.Status.CONVERTED)
        .select_related("customer")
    )
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    rows: list[dict] = []
    for r in qs.order_by("created_at"):
        deposit = Decimal(str(r.deposit_amount or 0))
        if deposit <= 0:
            continue
        base = _empty_row()
        base["payment_reservation"] = _z(deposit)
        _apply_debit_credit(base)
        rows.append(
            {
                **base,
                "id": f"rsv-{r.id}",
                "date": r.created_at.date().isoformat(),
                "document_code": r.code,
                "season_id": "",
                "season_name": "",
                "transaction_type": "reservation",
                "transaction_label": "حجز عميل",
                "notes": r.notes or "عربون حجز",
                "source_type": "reservation",
                "source_id": str(r.id),
                "navigate_tab": "customer-reservations",
                "sort_key": f"{r.created_at.date().isoformat()}|{r.code}",
                "highlight": False,
            }
        )
    return rows


def _payment_rows(*, customer_id, date_from, date_to) -> list[dict]:
    qs = (
        ReceivablePayment.objects.using(_USING)
        .filter(customer_id=customer_id)
        .select_related("customer")
    )
    if date_from:
        qs = qs.filter(payment_date__gte=date_from)
    if date_to:
        qs = qs.filter(payment_date__lte=date_to)

    rows: list[dict] = []
    for pay in qs.order_by("payment_date", "created_at"):
        amount = Decimal(str(pay.amount or 0))
        if amount <= 0:
            continue
        base = _empty_row()
        base["payment_installments"] = _z(amount)
        _apply_debit_credit(base)
        rows.append(
            {
                **base,
                "id": f"rp-{pay.id}",
                "date": pay.payment_date.isoformat(),
                "document_code": pay.code,
                "season_id": "",
                "season_name": "",
                "transaction_type": "installment_collection",
                "transaction_label": "تحصيل قسط",
                "notes": pay.reference or "",
                "source_type": "receivable_payment",
                "source_id": str(pay.id),
                "navigate_tab": "installment-collection",
                "sort_key": f"{pay.payment_date.isoformat()}|{pay.code}",
                "highlight": False,
            }
        )
    return rows


def _apply_running_balance(rows: list[dict]) -> None:
    balance = Decimal("0")
    for row in rows:
        balance += _row_delta(row)
        row["balance"] = _z(balance)


def _summarize(rows: list[dict]) -> dict:
    totals = {k: Decimal("0") for k in (
        "sales_amount", "sales_interest", "sales_total",
        "returns_amount", "returns_interest", "returns_total",
        "payment_reservation", "payment_down", "payment_installments",
        "debit", "credit",
    )}
    cash_refunds = Decimal("0")
    for row in rows:
        for key in totals:
            if key == "payment_down":
                continue
            totals[key] += Decimal(row.get(key) or "0")
        down = Decimal(row.get("payment_down") or "0")
        if down < 0:
            cash_refunds += -down
        else:
            totals["payment_down"] += down
        totals["debit"] += Decimal(row.get("debit") or "0")
        totals["credit"] += Decimal(row.get("credit") or "0")

    total_sales = totals["sales_total"]
    total_returns = totals["returns_total"]
    net_sold = total_sales - total_returns
    total_payments = totals["payment_reservation"] + totals["payment_down"] + totals["payment_installments"]
    net_payments = total_payments - cash_refunds
    closing = net_sold - net_payments

    return {
        "columns": {k: _z(v) for k, v in totals.items()},
        "total_sales": _z(total_sales),
        "total_returns": _z(total_returns),
        "net_sold": _z(net_sold),
        "total_payments": _z(total_payments),
        "cash_refunds": _z(cash_refunds),
        "net_payments": _z(net_payments),
        "closing_balance": _z(closing),
        "closing_debit": _z(max(closing, Decimal("0"))),
        "closing_credit": _z(max(-closing, Decimal("0"))),
        "balance_label": "مدين" if closing >= 0 else "دائن",
    }


def customer_account_statement(
    *,
    customer_id,
    date_from=None,
    date_to=None,
    view: str = "detailed",
    limit: int = 500,
) -> dict:
    if not customer_id:
        raise ValidationError("العميل مطلوب.")

    try:
        customer = Customer.objects.using(_USING).get(pk=customer_id, is_active=True)
    except Customer.DoesNotExist:
        raise ValidationError("العميل غير موجود.")

    rows: list[dict] = []
    rows.extend(_sale_rows(customer_id=customer_id, date_from=date_from, date_to=date_to))
    rows.extend(_return_rows(customer_id=customer_id, date_from=date_from, date_to=date_to))
    rows.extend(_reservation_rows(customer_id=customer_id, date_from=date_from, date_to=date_to))
    rows.extend(_payment_rows(customer_id=customer_id, date_from=date_from, date_to=date_to))

    rows.sort(key=lambda r: r.get("sort_key", ""))
    rows = rows[:limit]
    _apply_running_balance(rows)

    return {
        "view": view,
        "customer": {
            "id": str(customer.id),
            "code": customer.code,
            "name_ar": customer.name_ar,
        },
        "rows": rows,
        "count": len(rows),
        "summary": _summarize(rows),
    }
