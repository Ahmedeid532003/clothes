"""كشف حساب موحد — مورد + عميل في آن واحد."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from erp.receivable_models import ReceivableInvoice, ReceivablePayment
from erp.sale_models import Sale
from erp.supplier_models import Supplier, SupplierAccountEntry

_USING = "tenant"


def _branch_label(branch, warehouse=None) -> str:
    if branch and getattr(branch, "name_ar", None):
        return branch.name_ar
    if warehouse and getattr(warehouse, "name_ar", None):
        return warehouse.name_ar
    return "الفرع"


def _supplier_entry_row(entry: SupplierAccountEntry) -> dict | None:
    amount = entry.amount.quantize(Decimal("0.01"))
    debit = Decimal("0")
    credit = Decimal("0")
    role = "supplier"
    description = entry.notes or entry.code
    source_type = ""
    source_code = entry.code
    branch_name = ""

    if entry.purchase_invoice_id:
        inv = entry.purchase_invoice
        source_type = "purchase"
        source_code = inv.code
        branch_name = _branch_label(inv.branch, inv.warehouse)
        if entry.entry_type == SupplierAccountEntry.EntryType.DEBIT:
            credit = amount
            description = f"مشتريات من فرع {branch_name}"
        else:
            debit = amount
            description = f"مرتجع شراء — فرع {branch_name}"
    elif entry.sale_id and entry.notes and "مبيعات" in entry.notes:
        return None
    elif entry.notes and "دفع مورد" in entry.notes:
        source_type = "supplier_payment"
        source_code = entry.code
        debit = amount
        description = entry.notes
    elif entry.price_adjustment_id:
        source_type = "price_adjustment"
        source_code = entry.price_adjustment.code
        is_okazion = source_code.startswith("OKZ")
        if is_okazion:
            description = entry.notes or f"خصم أوكازيون {source_code}"
            if entry.entry_type == SupplierAccountEntry.EntryType.DEBIT:
                debit = amount
            else:
                credit = amount
        else:
            if entry.entry_type == SupplierAccountEntry.EntryType.DEBIT:
                credit = amount
            else:
                debit = amount
            description = entry.notes or f"إشعار خصم {source_code}"
    else:
        if entry.entry_type == SupplierAccountEntry.EntryType.DEBIT:
            credit = amount
        else:
            debit = amount

    return {
        "id": str(entry.id),
        "date": entry.created_at.date().isoformat(),
        "description": description,
        "debit": str(debit),
        "credit": str(credit),
        "role": role,
        "source_type": source_type,
        "source_code": source_code,
        "branch_name": branch_name,
        "created_at": entry.created_at.isoformat(),
    }


def counterparty_statement(
    *,
    supplier_id: str,
    date_from=None,
    date_to=None,
    limit: int = 300,
) -> dict:
    try:
        supplier = (
            Supplier.objects.using(_USING)
            .select_related("linked_customer", "supplier_type")
            .get(pk=supplier_id, is_active=True)
        )
    except Supplier.DoesNotExist:
        raise ValidationError("المورد غير موجود.")

    entry_qs = (
        SupplierAccountEntry.objects.using(_USING)
        .select_related(
            "purchase_invoice",
            "purchase_invoice__branch",
            "purchase_invoice__warehouse",
            "price_adjustment",
            "sale",
        )
        .filter(supplier_id=supplier_id)
        .order_by("created_at")
    )
    if date_from:
        entry_qs = entry_qs.filter(created_at__date__gte=date_from)
    if date_to:
        entry_qs = entry_qs.filter(created_at__date__lte=date_to)

    rows: list[dict] = []
    for entry in entry_qs:
        row = _supplier_entry_row(entry)
        if row:
            rows.append(row)

    customer_id = supplier.linked_customer_id
    if supplier.is_also_customer and customer_id:
        sale_qs = (
            Sale.objects.using(_USING)
            .select_related("branch", "warehouse")
            .filter(customer_id=customer_id, status=Sale.Status.COMPLETED)
            .order_by("created_at")
        )
        if date_from:
            sale_qs = sale_qs.filter(created_at__date__gte=date_from)
        if date_to:
            sale_qs = sale_qs.filter(created_at__date__lte=date_to)

        for sale in sale_qs:
            branch_name = _branch_label(sale.branch, sale.warehouse)
            rows.append(
                {
                    "id": f"sale-{sale.id}",
                    "date": sale.created_at.date().isoformat(),
                    "description": f"مبيعات إلى المورد من فرع {branch_name}",
                    "debit": str(sale.total.quantize(Decimal("0.01"))),
                    "credit": "0",
                    "role": "customer",
                    "source_type": "sale",
                    "source_code": sale.code,
                    "branch_name": branch_name,
                    "created_at": sale.created_at.isoformat(),
                }
            )

        recv_qs = (
            ReceivablePayment.objects.using(_USING)
            .filter(customer_id=customer_id)
            .order_by("payment_date")
        )
        if date_from:
            recv_qs = recv_qs.filter(payment_date__gte=date_from)
        if date_to:
            recv_qs = recv_qs.filter(payment_date__lte=date_to)

        for payment in recv_qs:
            rows.append(
                {
                    "id": f"rcp-{payment.id}",
                    "date": payment.payment_date.isoformat(),
                    "description": f"تحصيل من المورد — {payment.code}",
                    "debit": "0",
                    "credit": str(payment.amount.quantize(Decimal("0.01"))),
                    "role": "customer",
                    "source_type": "receivable_payment",
                    "source_code": payment.code,
                    "branch_name": "",
                    "created_at": payment.created_at.isoformat(),
                }
            )

        open_recv = (
            ReceivableInvoice.objects.using(_USING)
            .filter(customer_id=customer_id)
            .exclude(status=ReceivableInvoice.Status.PAID)
            .aggregate(total=Sum("amount_total"), paid=Sum("amount_paid"))
        )
    else:
        open_recv = {"total": None, "paid": None}

    rows.sort(key=lambda r: (r["date"], r["created_at"]))
    if limit:
        rows = rows[-limit:]

    debit_total = sum(Decimal(r["debit"]) for r in rows)
    credit_total = sum(Decimal(r["credit"]) for r in rows)
    net_balance = (credit_total - debit_total).quantize(Decimal("0.01"))

    linked_customer = None
    if supplier.linked_customer_id:
        c = supplier.linked_customer
        linked_customer = {
            "id": str(c.id),
            "code": c.code,
            "name_ar": c.name_ar,
        }

    return {
        "supplier_id": str(supplier.id),
        "supplier_code": supplier.code,
        "supplier_name": supplier.name_ar,
        "is_also_customer": supplier.is_also_customer,
        "linked_customer": linked_customer,
        "rows": rows,
        "count": len(rows),
        "summary": {
            "debit_total": str(debit_total.quantize(Decimal("0.01"))),
            "credit_total": str(credit_total.quantize(Decimal("0.01"))),
            "net_balance": str(net_balance),
            "net_label": "دائن" if net_balance > 0 else ("مدين" if net_balance < 0 else "متزن"),
        },
    }
