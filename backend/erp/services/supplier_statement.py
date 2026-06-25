"""كشف حساب مورد — تفصيلي وحساب عام."""

from __future__ import annotations

from decimal import Decimal

from rest_framework.exceptions import ValidationError

from erp.purchase_models import PurchaseInvoice
from erp.sale_models import Sale, SaleLine
from erp.services.inventory_extended import _variant_unit_price
from erp.supplier_models import Supplier, SupplierAccountEntry, SupplierPayment

_USING = "tenant"
_MONEY = Decimal("0.01")

_PAPER_METHODS = {
    SupplierPayment.PaymentMethod.CHEQUE,
    SupplierPayment.PaymentMethod.PROMISSORY_NOTE,
    SupplierPayment.PaymentMethod.OTHER_PAPERS,
}


def _z(v: Decimal) -> str:
    return str(v.quantize(_MONEY))


def _empty_row() -> dict:
    return {
        "purchases_total": "0",
        "purchases_discount": "0",
        "purchases_net": "0",
        "returns_total": "0",
        "returns_discount": "0",
        "returns_net": "0",
        "okazion_discount": "0",
        "payment_cash": "0",
        "payment_papers": "0",
        "debit": "0",
        "credit": "0",
    }


def _calc_actual_supplier_sales(
    *,
    supplier_id,
    season_id=None,
    date_from=None,
    date_to=None,
) -> str:
    """مجموع تكلفة ما بيع من أصناف المورد — للأمانات."""
    lines = (
        SaleLine.objects.using(_USING)
        .filter(
            sale__status=Sale.Status.COMPLETED,
            variant__product__supplier_id=supplier_id,
        )
        .select_related("variant__product", "sale")
    )
    if season_id:
        lines = lines.filter(sale__season_id=season_id)
    if date_from:
        lines = lines.filter(sale__created_at__date__gte=date_from)
    if date_to:
        lines = lines.filter(sale__created_at__date__lte=date_to)

    total = Decimal("0")
    for line in lines:
        if not line.variant_id:
            continue
        cost = _variant_unit_price(line.variant, "purchase_price")
        total += cost * line.quantity
    return _z(total)


def _purchase_rows(*, supplier_id, season_id, date_from, date_to) -> list[dict]:
    qs = (
        PurchaseInvoice.objects.using(_USING)
        .filter(supplier_id=supplier_id, status=PurchaseInvoice.Status.RECEIVED)
        .select_related("season", "supplier")
    )
    if season_id:
        qs = qs.filter(season_id=season_id)
    if date_from:
        qs = qs.filter(invoice_date__gte=date_from)
    if date_to:
        qs = qs.filter(invoice_date__lte=date_to)

    rows: list[dict] = []
    for inv in qs.order_by("invoice_date", "created_at"):
        is_return = inv.invoice_type == PurchaseInvoice.InvoiceType.RETURN
        if not is_return and inv.payment_method == PurchaseInvoice.PaymentMethod.CASH:
            continue

        base = _empty_row()
        subtotal = Decimal(str(inv.subtotal or 0))
        discount = Decimal(str(inv.discount_amount or 0))
        net = Decimal(str(inv.total or 0))

        if is_return:
            base["returns_total"] = _z(subtotal)
            base["returns_discount"] = _z(discount)
            base["returns_net"] = _z(net)
            base["debit"] = _z(net)
            tx_type = "purchase_return"
            label = "فاتورة مرتجع"
            nav_tab = "purchase-return-invoices"
        else:
            base["purchases_total"] = _z(subtotal)
            base["purchases_discount"] = _z(discount)
            base["purchases_net"] = _z(net)
            base["credit"] = _z(net)
            tx_type = "purchase"
            label = "فاتورة مشتريات"
            nav_tab = "purchase-invoices"

        rows.append(
            {
                **base,
                "id": f"pi-{inv.id}",
                "date": inv.invoice_date.isoformat(),
                "document_code": inv.code,
                "season_id": str(inv.season_id),
                "season_name": inv.season.name_ar if inv.season_id else "",
                "transaction_type": tx_type,
                "transaction_label": label,
                "notes": inv.notes or "",
                "source_type": tx_type,
                "source_id": str(inv.id),
                "navigate_tab": nav_tab,
                "sort_key": f"{inv.invoice_date.isoformat()}|{inv.code}",
            }
        )
    return rows


def _payment_rows(*, supplier_id, season_id, date_from, date_to) -> list[dict]:
    qs = (
        SupplierPayment.objects.using(_USING)
        .filter(supplier_id=supplier_id, status=SupplierPayment.Status.APPROVED)
        .select_related("supplier")
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
        base["debit"] = _z(amount)
        if pay.payment_method in _PAPER_METHODS:
            base["payment_papers"] = _z(amount)
            label = "حافظة شيكات"
            notes = pay.notes or (
                f"{pay.paper_cheque_number}" if pay.paper_cheque_number else ""
            )
        else:
            base["payment_cash"] = _z(amount)
            label = "دفعة نقدية"
            notes = pay.notes or ""

        rows.append(
            {
                **base,
                "id": f"sp-{pay.id}",
                "date": pay.payment_date.isoformat(),
                "document_code": pay.code,
                "season_id": "",
                "season_name": season_id and "" or "",
                "transaction_type": "payment",
                "transaction_label": label,
                "notes": notes,
                "source_type": "supplier_payment",
                "source_id": str(pay.id),
                "navigate_tab": "supplier-payments",
                "sort_key": f"{pay.payment_date.isoformat()}|{pay.code}",
            }
        )
    return rows


def _okazion_rows(*, supplier_id, season_id, date_from, date_to) -> list[dict]:
    qs = (
        SupplierAccountEntry.objects.using(_USING)
        .filter(supplier_id=supplier_id, price_adjustment__isnull=False)
        .select_related("price_adjustment", "price_adjustment__season", "supplier")
    )
    if season_id:
        qs = qs.filter(price_adjustment__season_id=season_id)
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    rows: list[dict] = []
    for entry in qs.order_by("created_at"):
        adj = entry.price_adjustment
        if not adj:
            continue
        amount = Decimal(str(entry.amount or 0))
        if amount <= 0:
            continue
        base = _empty_row()
        is_okz = adj.code.startswith("OKZ")
        base["okazion_discount"] = _z(amount)
        base["debit"] = _z(amount)
        label = "خصم أوكازيون" if is_okz else "خصم عام"
        rows.append(
            {
                **base,
                "id": f"sa-{entry.id}",
                "date": entry.created_at.date().isoformat(),
                "document_code": adj.code,
                "season_id": str(adj.season_id) if adj.season_id else "",
                "season_name": adj.season.name_ar if adj.season_id else "",
                "transaction_type": "okazion_discount" if is_okz else "price_adjustment",
                "transaction_label": label,
                "notes": entry.notes or "",
                "source_type": "okazion_discount" if is_okz else "price_adjustment",
                "source_id": str(adj.id),
                "navigate_tab": "supplier-discounts",
                "sort_key": f"{entry.created_at.date().isoformat()}|{adj.code}",
            }
        )
    return rows


def _apply_running_balance(rows: list[dict]) -> None:
    balance = Decimal("0")
    for row in rows:
        credit = Decimal(row.get("credit") or "0")
        debit = Decimal(row.get("debit") or "0")
        balance += credit - debit
        row["balance"] = _z(balance)


def _summarize(rows: list[dict]) -> dict:
    totals = {
        "purchases_total": Decimal("0"),
        "purchases_discount": Decimal("0"),
        "purchases_net": Decimal("0"),
        "returns_total": Decimal("0"),
        "returns_discount": Decimal("0"),
        "returns_net": Decimal("0"),
        "okazion_discount": Decimal("0"),
        "payment_cash": Decimal("0"),
        "payment_papers": Decimal("0"),
        "debit": Decimal("0"),
        "credit": Decimal("0"),
    }
    for row in rows:
        for key in totals:
            totals[key] += Decimal(row.get(key) or "0")

    net_purchases = totals["purchases_net"]
    net_after_discount = net_purchases - totals["returns_net"] - totals["okazion_discount"]
    net_payments = totals["payment_cash"] + totals["payment_papers"]
    closing = totals["credit"] - totals["debit"]

    return {
        "columns": {k: _z(v) for k, v in totals.items()},
        "net_purchases": _z(net_purchases),
        "net_after_returns_discount": _z(net_after_discount),
        "net_payments": _z(net_payments),
        "closing_balance": _z(closing),
        "closing_debit": _z(max(-closing, Decimal("0"))),
        "closing_credit": _z(max(closing, Decimal("0"))),
        "balance_label": "دائن" if closing >= 0 else "مدين",
    }


def supplier_account_statement(
    *,
    supplier_id,
    season_id=None,
    date_from=None,
    date_to=None,
    view: str = "detailed",
    limit: int = 500,
) -> dict:
    if not supplier_id:
        raise ValidationError("المورد مطلوب.")

    try:
        supplier = Supplier.objects.using(_USING).get(pk=supplier_id, is_active=True)
    except Supplier.DoesNotExist:
        raise ValidationError("المورد غير موجود.")

    rows = []
    rows.extend(_purchase_rows(supplier_id=supplier_id, season_id=season_id, date_from=date_from, date_to=date_to))
    rows.extend(_payment_rows(supplier_id=supplier_id, season_id=season_id, date_from=date_from, date_to=date_to))
    rows.extend(_okazion_rows(supplier_id=supplier_id, season_id=season_id, date_from=date_from, date_to=date_to))

    rows.sort(key=lambda r: r.get("sort_key", ""))
    rows = rows[:limit]
    _apply_running_balance(rows)

    actual_sales = _calc_actual_supplier_sales(
        supplier_id=supplier_id,
        season_id=season_id,
        date_from=date_from,
        date_to=date_to,
    )
    summary = _summarize(rows)
    summary["actual_supplier_sales"] = actual_sales

    season_name = ""
    if season_id:
        from erp.models import Season

        try:
            season_name = Season.objects.using(_USING).get(pk=season_id).name_ar
        except Season.DoesNotExist:
            pass

    return {
        "view": view,
        "supplier": {
            "id": str(supplier.id),
            "code": supplier.code,
            "name_ar": supplier.name_ar,
        },
        "season_id": str(season_id) if season_id else "",
        "season_name": season_name,
        "rows": rows,
        "count": len(rows),
        "summary": summary,
    }
