"""تقرير مخزون مجموعة موردين: مشتريات مقابل مبيعات مقابل رصيد المخزن."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from django.db.models import Case, DecimalField, F, Q, Sum, When
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError

from erp.product_models import ProductVariant, StockBalance
from erp.purchase_models import PurchaseInvoice, PurchaseInvoiceLine
from erp.sale_models import Sale, SaleLine
from erp.supplier_models import SupplierGroup


def supplier_group_inventory_report(
    *,
    supplier_group_id: str,
    warehouse_id: str,
    season_id: str | None = None,
) -> dict:
    if not supplier_group_id or not warehouse_id:
        raise ValidationError("حدد مجموعة المورد والمخزن.")

    try:
        group = SupplierGroup.objects.using("tenant").get(
            pk=supplier_group_id, is_active=True
        )
    except SupplierGroup.DoesNotExist:
        raise ValidationError("مجموعة الموردين غير موجودة.")

    supplier_filter = Q(variant__product__supplier__supplier_group_id=supplier_group_id)
    season_filter = Q()
    if season_id:
        season_filter = Q(variant__product__season_id=season_id)

    purchase_sign = Case(
        When(
            invoice__invoice_type=PurchaseInvoice.InvoiceType.PURCHASE,
            then=F("quantity"),
        ),
        When(
            invoice__invoice_type=PurchaseInvoice.InvoiceType.RETURN,
            then=-F("quantity"),
        ),
        default=Decimal("0"),
        output_field=DecimalField(max_digits=14, decimal_places=3),
    )
    purchase_amount_sign = Case(
        When(
            invoice__invoice_type=PurchaseInvoice.InvoiceType.PURCHASE,
            then=F("line_total"),
        ),
        When(
            invoice__invoice_type=PurchaseInvoice.InvoiceType.RETURN,
            then=-F("line_total"),
        ),
        default=Decimal("0"),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )

    purchases = (
        PurchaseInvoiceLine.objects.using("tenant")
        .filter(
            invoice__status=PurchaseInvoice.Status.RECEIVED,
            invoice__warehouse_id=warehouse_id,
            invoice__supplier__supplier_group_id=supplier_group_id,
        )
        .filter(season_filter)
        .values("variant_id")
        .annotate(
            purchased_qty=Coalesce(Sum(purchase_sign), Decimal("0")),
            purchased_cost=Coalesce(Sum(purchase_amount_sign), Decimal("0")),
        )
    )

    sales = (
        SaleLine.objects.using("tenant")
        .filter(
            sale__status=Sale.Status.COMPLETED,
            sale__warehouse_id=warehouse_id,
        )
        .filter(supplier_filter)
        .filter(season_filter)
        .values("variant_id")
        .annotate(
            sold_qty=Coalesce(Sum("quantity"), Decimal("0")),
            sold_amount=Coalesce(Sum("line_total"), Decimal("0")),
        )
    )

    stock = (
        StockBalance.objects.using("tenant")
        .filter(warehouse_id=warehouse_id, quantity__gt=0)
        .filter(supplier_filter)
        .filter(season_filter)
        .values("variant_id")
        .annotate(stock_qty=Coalesce(Sum("quantity"), Decimal("0")))
    )

    by_variant: dict = defaultdict(
        lambda: {
            "purchased_qty": Decimal("0"),
            "purchased_cost": Decimal("0"),
            "sold_qty": Decimal("0"),
            "sold_amount": Decimal("0"),
            "stock_qty": Decimal("0"),
        }
    )

    for row in purchases:
        vid = row["variant_id"]
        by_variant[vid]["purchased_qty"] = row["purchased_qty"] or Decimal("0")
        by_variant[vid]["purchased_cost"] = row["purchased_cost"] or Decimal("0")

    for row in sales:
        vid = row["variant_id"]
        by_variant[vid]["sold_qty"] = row["sold_qty"] or Decimal("0")
        by_variant[vid]["sold_amount"] = row["sold_amount"] or Decimal("0")

    for row in stock:
        vid = row["variant_id"]
        by_variant[vid]["stock_qty"] = row["stock_qty"] or Decimal("0")

    if not by_variant:
        return {
            "supplier_group_id": str(group.id),
            "supplier_group_name": group.name_ar,
            "warehouse_id": warehouse_id,
            "season_id": season_id,
            "rows": [],
            "totals": _empty_totals(),
        }

    variants = {
        v.id: v
        for v in ProductVariant.objects.using("tenant")
        .filter(pk__in=by_variant.keys(), is_active=True)
        .select_related("product", "product__supplier", "size", "color")
    }

    rows = []
    totals = _empty_totals()

    for vid, agg in by_variant.items():
        variant = variants.get(vid)
        if not variant:
            continue

        purchased_qty = agg["purchased_qty"]
        purchased_cost = agg["purchased_cost"]
        sold_qty = agg["sold_qty"]
        sold_amount = agg["sold_amount"]
        stock_qty = agg["stock_qty"]

        expected_stock = purchased_qty - sold_qty
        diff_qty = stock_qty - expected_stock
        return_qty = max(Decimal("0"), purchased_qty - sold_qty - stock_qty)

        product = variant.product
        avg_cost = (
            (purchased_cost / purchased_qty).quantize(Decimal("0.01"))
            if purchased_qty > 0
            else (product.purchase_price or Decimal("0"))
        )
        stock_value = (stock_qty * avg_cost).quantize(Decimal("0.01"))

        row = {
            "variant_id": str(vid),
            "product_id": str(product.id),
            "product_code": product.code,
            "product_name": product.name_ar,
            "supplier_id": str(product.supplier_id) if product.supplier_id else None,
            "supplier_name": product.supplier.name_ar if product.supplier_id else "",
            "size_name": variant.size.name_ar,
            "color_name": variant.color.name_ar,
            "purchased_qty": str(purchased_qty.quantize(Decimal("0.001"))),
            "purchased_cost": str(purchased_cost.quantize(Decimal("0.01"))),
            "sold_qty": str(sold_qty.quantize(Decimal("0.001"))),
            "sold_amount": str(sold_amount.quantize(Decimal("0.01"))),
            "stock_qty": str(stock_qty.quantize(Decimal("0.001"))),
            "expected_stock": str(expected_stock.quantize(Decimal("0.001"))),
            "diff_qty": str(diff_qty.quantize(Decimal("0.001"))),
            "return_qty": str(return_qty.quantize(Decimal("0.001"))),
            "stock_value": str(stock_value),
        }
        rows.append(row)

        totals["purchased_qty"] += purchased_qty
        totals["purchased_cost"] += purchased_cost
        totals["sold_qty"] += sold_qty
        totals["sold_amount"] += sold_amount
        totals["stock_qty"] += stock_qty
        totals["expected_stock"] += expected_stock
        totals["diff_qty"] += diff_qty
        totals["return_qty"] += return_qty
        totals["stock_value"] += stock_value

    rows.sort(key=lambda r: (r["product_code"], r["size_name"], r["color_name"]))

    for k in totals:
        if k.endswith("_qty") or k == "expected_stock" or k == "diff_qty" or k == "return_qty":
            totals[k] = str(totals[k].quantize(Decimal("0.001")))
        else:
            totals[k] = str(totals[k].quantize(Decimal("0.01")))

    return {
        "supplier_group_id": str(group.id),
        "supplier_group_name": group.name_ar,
        "warehouse_id": warehouse_id,
        "season_id": season_id,
        "rows": rows,
        "totals": totals,
    }


def _empty_totals() -> dict:
    return {
        "purchased_qty": Decimal("0"),
        "purchased_cost": Decimal("0"),
        "sold_qty": Decimal("0"),
        "sold_amount": Decimal("0"),
        "stock_qty": Decimal("0"),
        "expected_stock": Decimal("0"),
        "diff_qty": Decimal("0"),
        "return_qty": Decimal("0"),
        "stock_value": Decimal("0"),
    }
