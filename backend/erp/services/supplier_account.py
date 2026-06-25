"""حركات حساب المورد — مبيعات بتكلفة المورد، إشعارات خصم مورد."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from django.db.models import Sum

from erp.services import catalog as catalog_service
from erp.services.inventory_extended import _variant_unit_price
from erp.supplier_models import SupplierAccountEntry


def _entry_payload(entry: SupplierAccountEntry) -> dict:
    source_type = ""
    source_code = ""
    if entry.purchase_invoice_id:
        source_type = "purchase"
        source_code = entry.purchase_invoice.code
    elif entry.sale_id:
        source_type = "sale"
        source_code = entry.sale.code
    elif entry.price_adjustment_id:
        source_type = "price_adjustment"
        source_code = entry.price_adjustment.code
        if entry.price_adjustment.code.startswith("OKZ"):
            source_type = "okazion_discount"
    elif entry.notes and "دفع مورد" in entry.notes:
        source_type = "supplier_payment"
        source_code = entry.code

    signed = entry.amount
    if entry.entry_type == SupplierAccountEntry.EntryType.CREDIT:
        signed = -signed

    return {
        "id": str(entry.id),
        "code": entry.code,
        "supplier": str(entry.supplier_id),
        "supplier_name": entry.supplier.name_ar,
        "entry_type": entry.entry_type,
        "amount": str(entry.amount.quantize(Decimal("0.01"))),
        "signed_amount": str(signed.quantize(Decimal("0.01"))),
        "source_type": source_type,
        "source_code": source_code,
        "sale_id": str(entry.sale_id) if entry.sale_id else None,
        "price_adjustment_id": (
            str(entry.price_adjustment_id) if entry.price_adjustment_id else None
        ),
        "notes": entry.notes,
        "created_at": entry.created_at.isoformat(),
    }


def supplier_account_ledger(
    *,
    supplier_id=None,
    date_from=None,
    date_to=None,
    limit: int = 300,
) -> dict:
    qs = (
        SupplierAccountEntry.objects.using("tenant")
        .select_related("supplier", "sale", "price_adjustment", "purchase_invoice")
        .order_by("-created_at")
    )
    if supplier_id:
        qs = qs.filter(supplier_id=supplier_id)
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    debit_total = qs.filter(entry_type=SupplierAccountEntry.EntryType.DEBIT).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    credit_total = qs.filter(entry_type=SupplierAccountEntry.EntryType.CREDIT).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    balance = (debit_total - credit_total).quantize(Decimal("0.01"))

    rows = [_entry_payload(e) for e in qs[:limit]]
    return {
        "rows": rows,
        "count": len(rows),
        "summary": {
            "debit_total": str(debit_total.quantize(Decimal("0.01"))),
            "credit_total": str(credit_total.quantize(Decimal("0.01"))),
            "balance": str(balance),
        },
    }


def post_sale_supplier_entries(sale) -> list[SupplierAccountEntry]:
    """
    تسجيل المبيعات في حساب المورد بسعر التكلفة فقط (purchase_price).
    فرق سعر البيع / العروض من المحل لا يظهر للمورد.
    """
    totals: dict[UUID, Decimal] = {}
    for line in sale.lines.select_related(
        "variant__product", "composite_product"
    ).prefetch_related("composite_product__lines__variant__product"):
        if line.composite_product_id:
            for comp in line.composite_product.lines.select_related("variant__product"):
                product = comp.variant.product
                if not product.supplier_id:
                    continue
                unit_cost = _variant_unit_price(comp.variant, "purchase_price")
                if unit_cost <= 0:
                    continue
                amount = (unit_cost * comp.quantity * line.quantity).quantize(Decimal("0.01"))
                totals[product.supplier_id] = totals.get(product.supplier_id, Decimal("0")) + amount
            continue
        if not line.variant_id:
            continue
        product = line.variant.product
        if not product.supplier_id:
            continue
        unit_cost = _variant_unit_price(line.variant, "purchase_price")
        if unit_cost <= 0:
            continue
        amount = (unit_cost * line.quantity).quantize(Decimal("0.01"))
        totals[product.supplier_id] = totals.get(product.supplier_id, Decimal("0")) + amount

    created: list[SupplierAccountEntry] = []
    for supplier_id, amount in totals.items():
        if amount <= 0:
            continue
        entry_code = catalog_service._next_code("SA", SupplierAccountEntry)
        entry = SupplierAccountEntry.objects.using("tenant").create(
            code=entry_code,
            supplier_id=supplier_id,
            sale=sale,
            entry_type=SupplierAccountEntry.EntryType.DEBIT,
            amount=amount,
            notes=f"مبيعات {sale.code} — تكلفة المورد فقط",
        )
        created.append(entry)
    return created
