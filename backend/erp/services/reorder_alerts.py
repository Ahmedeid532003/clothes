"""تنبيهات حد الطلب — موسم حالي مفتوح فقط."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from django.db.models import Case, Count, DecimalField, F, Sum, When
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError

from erp.models import Branch, BranchWarehouse, Season, Warehouse
from erp.product_models import Product, StockBalance
from erp.purchase_models import PurchaseInvoice, PurchaseInvoiceLine
from erp.purchase_order_models import PurchaseOrder, PurchaseOrderLine
from erp.sale_models import Sale, SaleLine
_USING = "tenant"


def _open_po_product_ids(season_id) -> set[str]:
    """أصناف لها أمر شراء مُرسل ولم يُستلم بالكامل."""
    try:
        qs = (
            PurchaseOrderLine.objects.using(_USING)
            .filter(
                order__season_id=season_id,
                order__status__in=[
                    PurchaseOrder.Status.SENT,
                    PurchaseOrder.Status.PARTIAL,
                ],
            )
            .filter(quantity_received__lt=F("quantity_ordered"))
        )
        return {str(row) for row in qs.values_list("product_id", flat=True)}
    except Exception:
        return set()


def _resolve_season(season_id: str | None) -> Season | None:
    if season_id:
        try:
            return Season.objects.using(_USING).get(pk=season_id)
        except Season.DoesNotExist:
            raise ValidationError("الموسم غير موجود.")
    return Season.objects.using(_USING).filter(is_current=True, is_open=True).first()


def build_reorder_alerts(*, season_id: str | None = None) -> dict:
    season = _resolve_season(season_id)
    if not season:
        return _empty_response(None, warning="لا يوجد موسم حالي مفتوح — عرّف موسمًا من شاشة المواسم.")
    if not season.is_open:
        return _empty_response(season, warning="حد الطلب يُطبق على الموسم المفتوح فقط.")

    sid = str(season.id)
    excluded_products = _open_po_product_ids(sid)

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

    purchases = (
        PurchaseInvoiceLine.objects.using(_USING)
        .filter(
            invoice__status=PurchaseInvoice.Status.RECEIVED,
            invoice__season_id=sid,
            variant__product__season_id=sid,
            variant__product__is_active=True,
        )
        .values("variant__product_id")
        .annotate(purchased_qty=Coalesce(Sum(purchase_sign), Decimal("0")))
    )

    sales = (
        SaleLine.objects.using(_USING)
        .filter(
            sale__status=Sale.Status.COMPLETED,
            sale__season_id=sid,
            variant__product__season_id=sid,
        )
        .values("variant__product_id")
        .annotate(sold_qty=Coalesce(Sum("quantity"), Decimal("0")))
    )

    stock_rows = (
        StockBalance.objects.using(_USING)
        .filter(
            quantity__gt=0,
            variant__product__season_id=sid,
            variant__product__is_active=True,
        )
        .values("variant__product_id", "warehouse_id")
        .annotate(stock_qty=Coalesce(Sum("quantity"), Decimal("0")))
    )

    purchase_count_rows = (
        PurchaseInvoiceLine.objects.using(_USING)
        .filter(
            invoice__status=PurchaseInvoice.Status.RECEIVED,
            invoice__invoice_type=PurchaseInvoice.InvoiceType.PURCHASE,
            invoice__season_id=sid,
            variant__product__season_id=sid,
        )
        .values("variant__product_id")
        .annotate(invoice_count=Count("invoice_id", distinct=True))
    )

    purchase_count_by_product: dict[str, int] = {}
    for row in purchase_count_rows:
        purchase_count_by_product[str(row["variant__product_id"])] = int(
            row.get("invoice_count") or 0
        )

    by_product_agg: dict = defaultdict(
        lambda: {
            "purchased_qty": Decimal("0"),
            "sold_qty": Decimal("0"),
            "stock_by_wh": defaultdict(lambda: Decimal("0")),
        }
    )

    for row in purchases:
        pid = str(row["variant__product_id"])
        by_product_agg[pid]["purchased_qty"] = row["purchased_qty"] or Decimal("0")

    for row in sales:
        pid = str(row["variant__product_id"])
        by_product_agg[pid]["sold_qty"] = row["sold_qty"] or Decimal("0")

    for row in stock_rows:
        pid = str(row["variant__product_id"])
        wh = str(row["warehouse_id"])
        by_product_agg[pid]["stock_by_wh"][wh] = row["stock_qty"] or Decimal("0")

    if not by_product_agg:
        return _empty_response(season)

    products = {
        str(p.id): p
        for p in Product.objects.using(_USING)
        .filter(pk__in=by_product_agg.keys(), is_active=True)
        .select_related("supplier", "brand", "season")
    }

    warehouses = list(
        Warehouse.objects.using(_USING)
        .filter(is_active=True)
        .select_related("primary_branch")
        .order_by("code")
    )
    branch_links = list(
        BranchWarehouse.objects.using(_USING)
        .select_related("branch", "warehouse")
        .filter(warehouse__is_active=True, branch__is_active=True)
    )
    branches = []
    seen_branch_ids: set[str] = set()
    for w in warehouses:
        if w.primary_branch_id:
            bid = str(w.primary_branch_id)
            if bid not in seen_branch_ids:
                seen_branch_ids.add(bid)
                branches.append(
                    {
                        "branch_id": bid,
                        "branch_name": w.primary_branch.name_ar,
                        "warehouse_id": str(w.id),
                    }
                )
    for link in branch_links:
        bid = str(link.branch_id)
        if bid not in seen_branch_ids:
            seen_branch_ids.add(bid)
            branches.append(
                {
                    "branch_id": bid,
                    "branch_name": link.branch.name_ar,
                    "warehouse_id": str(link.warehouse_id),
                }
            )

    wh_to_branch: dict[str, str] = {}
    for w in warehouses:
        if w.primary_branch_id:
            wh_to_branch[str(w.id)] = str(w.primary_branch_id)
    for link in branch_links:
        wh_to_branch.setdefault(str(link.warehouse_id), str(link.branch_id))

    by_product: dict = defaultdict(
        lambda: {
            "product": None,
            "purchased_qty": Decimal("0"),
            "sold_qty": Decimal("0"),
            "remaining_qty": Decimal("0"),
            "purchase_count": 0,
            "stock_by_branch": defaultdict(lambda: Decimal("0")),
            "reorder_percent": Decimal("0"),
        }
    )

    for pid, agg in by_product_agg.items():
        product = products.get(pid)
        if not product:
            continue
        if pid in excluded_products:
            continue
        bucket = by_product[pid]
        bucket["product"] = product
        bucket["reorder_percent"] = product.reorder_percent or Decimal("0")
        bucket["purchased_qty"] += agg["purchased_qty"]
        bucket["sold_qty"] += agg["sold_qty"]
        bucket["purchase_count"] = purchase_count_by_product.get(pid, 0)
        for wh_id, qty in agg["stock_by_wh"].items():
            branch_id = wh_to_branch.get(wh_id)
            if branch_id:
                bucket["stock_by_branch"][branch_id] += qty

    alerts = []
    for pid, bucket in by_product.items():
        product = bucket["product"]
        if not product:
            continue
        purchased = bucket["purchased_qty"]
        if purchased <= 0:
            continue
        reorder_pct = bucket["reorder_percent"]
        if reorder_pct <= 0:
            continue
        # إجمالي الرصيد من كل المخازن (وليس الفروع فقط)
        total_stock = sum(
            (agg["stock_by_wh"].values() if (agg := by_product_agg.get(pid)) else []),
            Decimal("0"),
        )
        remaining = total_stock
        sold = bucket["sold_qty"]
        threshold = (purchased * reorder_pct / Decimal("100")).quantize(Decimal("0.001"))
        if remaining > threshold:
            continue

        branch_stocks = []
        for br in branches:
            qty = bucket["stock_by_branch"].get(br["branch_id"], Decimal("0"))
            branch_stocks.append(
                {
                    "branch_id": br["branch_id"],
                    "branch_name": br["branch_name"],
                    "quantity": str(qty.quantize(Decimal("0.001"))),
                }
            )

        alerts.append(
            {
                "product_id": pid,
                "supplier_id": str(product.supplier_id) if product.supplier_id else "",
                "supplier_name": product.supplier.name_ar if product.supplier_id else "—",
                "product_code": product.code,
                "product_name": product.name_ar,
                "product_description": product.description or "",
                "brand_name": product.brand.name_ar if product.brand_id else "—",
                "season_id": sid,
                "season_name": season.name_ar,
                "purchased_qty": str(purchased.quantize(Decimal("0.001"))),
                "sold_qty": str(sold.quantize(Decimal("0.001"))),
                "remaining_qty": str(total_stock.quantize(Decimal("0.001"))),
                "reorder_percent": str(reorder_pct),
                "threshold_qty": str(threshold),
                "purchase_count": bucket["purchase_count"],
                "branch_stocks": branch_stocks,
                "suggested_order_qty": "",
            }
        )

    alerts.sort(key=lambda r: (r["supplier_name"], r["product_code"]))
    return {
        "season_id": sid,
        "season_name": season.name_ar,
        "branches": [{"branch_id": b["branch_id"], "branch_name": b["branch_name"]} for b in branches],
        "items": alerts,
        "total": len(alerts),
        "warning": "",
    }


def _empty_response(season: Season | None, *, warning: str = "") -> dict:
    return {
        "season_id": str(season.id) if season else "",
        "season_name": season.name_ar if season else "",
        "branches": [],
        "items": [],
        "total": 0,
        "warning": warning,
    }
