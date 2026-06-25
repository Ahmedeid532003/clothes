"""تقرير حركة أصناف عام — مشتريات، مرتجعات، مبيعات، رصيد بالفروع."""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal
from urllib.parse import quote

from django.db.models import Count, DecimalField, F, Q, Sum
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError

from erp.models import Branch, BranchWarehouse, Warehouse
from erp.product_models import Product, ProductVariant, StockBalance
from erp.purchase_models import PurchaseInvoice, PurchaseInvoiceLine
from erp.sale_models import Sale, SaleLine

_USING = "tenant"
_QTY = Decimal("0.001")
_MONEY = Decimal("0.01")


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        raise ValidationError("صيغة التاريخ غير صحيحة.")


def _warehouse_ids_for_branch(branch_id: str | None) -> list[str] | None:
    if not branch_id:
        return None
    ids = list(
        Warehouse.objects.using(_USING)
        .filter(is_active=True, primary_branch_id=branch_id)
        .values_list("id", flat=True)
    )
    return [str(x) for x in ids]


def _product_filter_q(
    *,
    supplier_id: str | None,
    brand_id: str | None,
    section_id: str | None,
    classification_id: str | None,
    season_id: str | None,
    product_id: str | None,
    product_q: str | None = None,
) -> Q:
    q = Q(variant__product__is_active=True)
    if supplier_id:
        q &= Q(variant__product__supplier_id=supplier_id)
    if brand_id:
        q &= Q(variant__product__brand_id=brand_id)
    if section_id:
        q &= Q(variant__product__section_id=section_id)
    if classification_id:
        q &= Q(variant__product__classification_id=classification_id)
    if season_id:
        q &= Q(variant__product__season_id=season_id)
    if product_id:
        q &= Q(variant__product_id=product_id)
    if product_q and product_q.strip():
        term = product_q.strip()
        q &= Q(variant__product__code__icontains=term) | Q(variant__product__name_ar__icontains=term)
    return q


def _unit_price(product: Product, mode: str) -> Decimal:
    if mode == "sale":
        return product.sale_price or Decimal("0")
    if mode == "wholesale":
        return product.offer_price or product.sale_price or Decimal("0")
    return product.purchase_price or Decimal("0")


def _empty_totals(branches: list[dict]) -> dict:
    out = {
        "purchased_qty": Decimal("0"),
        "purchased_value": Decimal("0"),
        "return_qty": Decimal("0"),
        "return_value": Decimal("0"),
        "sold_qty": Decimal("0"),
        "sold_value": Decimal("0"),
        "balance_qty": Decimal("0"),
        "balance_value": Decimal("0"),
        "branch_qty": {str(b["branch_id"]): Decimal("0") for b in branches},
    }
    return out


def build_whatsapp_inventory_message(payload: dict) -> str:
    supplier = payload.get("supplier_name") or "المورد"
    period = payload.get("period_label") or ""
    totals = payload.get("totals") or {}
    return (
        f"السلام عليكم،\n"
        f"مرفق كشف جرد / حركة أصناف.\n"
        f"المورد: {supplier}\n"
        f"الفترة: {period}\n"
        f"إجمالي الوارد: {totals.get('purchased_qty', '0')}\n"
        f"إجمالي المباع: {totals.get('sold_qty', '0')}\n"
        f"إجمالي الرصيد: {totals.get('balance_qty', '0')}\n"
        f"قيمة الرصيد: {totals.get('balance_value', '0')}\n"
        f"يرجى مراجعة ملف PDF المرفق."
    )


def whatsapp_url_for_inventory(payload: dict) -> str | None:
    phone = "".join(x for x in (payload.get("supplier_whatsapp") or "") if x.isdigit())
    if not phone:
        return None
    text = quote(build_whatsapp_inventory_message(payload))
    return f"https://wa.me/{phone}?text={text}"


def general_item_movement_report(
    *,
    branch_id: str | None = None,
    supplier_id: str | None = None,
    brand_id: str | None = None,
    section_id: str | None = None,
    classification_id: str | None = None,
    season_id: str | None = None,
    product_id: str | None = None,
    product_q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    valuation_mode: str = "purchase",
) -> dict:
    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to)
    if d_from and d_to and d_from > d_to:
        raise ValidationError("تاريخ البداية بعد تاريخ النهاية.")

    if valuation_mode not in ("purchase", "sale", "wholesale"):
        valuation_mode = "purchase"

    wh_ids = _warehouse_ids_for_branch(branch_id)
    product_q = _product_filter_q(
        supplier_id=supplier_id,
        brand_id=brand_id,
        section_id=section_id,
        classification_id=classification_id,
        season_id=season_id,
        product_id=product_id,
        product_q=product_q,
    )

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
    if branch_id:
        wh_ids_branch = {str(l.warehouse_id) for l in branch_links if str(l.branch_id) == str(branch_id)}
        wh_ids_branch |= {str(w.id) for w in warehouses if str(w.primary_branch_id) == str(branch_id)}
        warehouses = [w for w in warehouses if str(w.id) in wh_ids_branch]

    branches = []
    seen_branch: set[str] = set()
    for w in warehouses:
        if w.primary_branch_id:
            bid = str(w.primary_branch_id)
            if bid not in seen_branch:
                seen_branch.add(bid)
                branches.append(
                    {
                        "branch_id": bid,
                        "branch_name": w.primary_branch.name_ar,
                        "warehouse_id": str(w.id),
                    }
                )
    for link in branch_links:
        bid = str(link.branch_id)
        if bid not in seen_branch:
            seen_branch.add(bid)
            branches.append(
                {
                    "branch_id": bid,
                    "branch_name": link.branch.name_ar,
                    "warehouse_id": str(link.warehouse_id),
                }
            )

    if not branches:
        branches = [
            {
                "branch_id": str(b.id),
                "branch_name": b.name_ar,
                "warehouse_id": "",
            }
            for b in Branch.objects.using(_USING).filter(is_active=True).order_by("code")
        ]

    wh_to_branch: dict[str, str] = {}
    for w in warehouses:
        if w.primary_branch_id:
            wh_to_branch[str(w.id)] = str(w.primary_branch_id)
    for link in branch_links:
        wh_to_branch.setdefault(str(link.warehouse_id), str(link.branch_id))

    purchase_base = PurchaseInvoiceLine.objects.using(_USING).filter(
        invoice__status=PurchaseInvoice.Status.RECEIVED,
        invoice__invoice_type=PurchaseInvoice.InvoiceType.PURCHASE,
    ).filter(product_q)
    return_base = PurchaseInvoiceLine.objects.using(_USING).filter(
        invoice__status=PurchaseInvoice.Status.RECEIVED,
        invoice__invoice_type=PurchaseInvoice.InvoiceType.RETURN,
    ).filter(product_q)
    sales_base = SaleLine.objects.using(_USING).filter(
        sale__status=Sale.Status.COMPLETED,
    ).filter(product_q)

    if d_from:
        purchase_base = purchase_base.filter(invoice__invoice_date__gte=d_from)
        return_base = return_base.filter(invoice__invoice_date__gte=d_from)
        sales_base = sales_base.filter(sale__created_at__date__gte=d_from)
    if d_to:
        purchase_base = purchase_base.filter(invoice__invoice_date__lte=d_to)
        return_base = return_base.filter(invoice__invoice_date__lte=d_to)
        sales_base = sales_base.filter(sale__created_at__date__lte=d_to)
    if wh_ids:
        purchase_base = purchase_base.filter(invoice__warehouse_id__in=wh_ids)
        return_base = return_base.filter(invoice__warehouse_id__in=wh_ids)
        sales_base = sales_base.filter(sale__warehouse_id__in=wh_ids)
    elif branch_id:
        purchase_base = purchase_base.filter(invoice__branch_id=branch_id)
        sales_base = sales_base.filter(sale__branch_id=branch_id)

    purchases = (
        purchase_base.values("variant__product_id")
        .annotate(
            qty=Coalesce(Sum("quantity"), Decimal("0")),
            value=Coalesce(Sum("line_total"), Decimal("0")),
            invoice_count=Count("invoice_id", distinct=True),
        )
    )
    returns = (
        return_base.values("variant__product_id")
        .annotate(
            qty=Coalesce(Sum("quantity"), Decimal("0")),
            value=Coalesce(Sum("line_total"), Decimal("0")),
        )
    )
    sales = (
        sales_base.values("variant__product_id")
        .annotate(
            qty=Coalesce(Sum("quantity"), Decimal("0")),
            value=Coalesce(Sum("line_total"), Decimal("0")),
        )
    )

    stock_q = StockBalance.objects.using(_USING).filter(quantity__gt=0).filter(product_q)
    if wh_ids:
        stock_q = stock_q.filter(warehouse_id__in=wh_ids)
    elif branch_id:
        branch_wh = list(wh_to_branch.keys())
        if branch_wh:
            stock_q = stock_q.filter(warehouse_id__in=branch_wh)

    stock_rows = (
        stock_q.values("variant__product_id", "warehouse_id")
        .annotate(qty=Coalesce(Sum("quantity"), Decimal("0")))
    )

    by_product: dict = defaultdict(
        lambda: {
            "purchased_qty": Decimal("0"),
            "purchased_value": Decimal("0"),
            "return_qty": Decimal("0"),
            "return_value": Decimal("0"),
            "sold_qty": Decimal("0"),
            "sold_value": Decimal("0"),
            "purchase_count": 0,
            "branch_qty": defaultdict(lambda: Decimal("0")),
            "total_stock": Decimal("0"),
        }
    )

    for row in purchases:
        pid = str(row["variant__product_id"])
        by_product[pid]["purchased_qty"] = row["qty"] or Decimal("0")
        by_product[pid]["purchased_value"] = row["value"] or Decimal("0")
        by_product[pid]["purchase_count"] = int(row.get("invoice_count") or 0)

    for row in returns:
        pid = str(row["variant__product_id"])
        by_product[pid]["return_qty"] = row["qty"] or Decimal("0")
        by_product[pid]["return_value"] = row["value"] or Decimal("0")

    for row in sales:
        pid = str(row["variant__product_id"])
        by_product[pid]["sold_qty"] = row["qty"] or Decimal("0")
        by_product[pid]["sold_value"] = row["value"] or Decimal("0")

    for row in stock_rows:
        pid = str(row["variant__product_id"])
        wh = str(row["warehouse_id"])
        br = wh_to_branch.get(wh)
        qty = row["qty"] or Decimal("0")
        by_product[pid]["total_stock"] += qty
        if br:
            by_product[pid]["branch_qty"][br] += qty

    if not by_product:
        totals = _empty_totals(branches)
        return _serialize_response(
            branches=branches,
            rows=[],
            totals=totals,
            filters=_filter_meta(
                branch_id, supplier_id, valuation_mode, d_from, d_to, season_id
            ),
            whatsapp=None,
        )

    products = {
        str(p.id): p
        for p in Product.objects.using(_USING)
        .filter(pk__in=by_product.keys(), is_active=True)
        .select_related("supplier", "brand", "section", "classification", "season")
    }

    rows = []
    totals = _empty_totals(branches)

    for pid, agg in by_product.items():
        product = products.get(pid)
        if not product:
            continue

        purchased_qty = agg["purchased_qty"]
        purchased_value = agg["purchased_value"]
        return_qty = agg["return_qty"]
        return_value = agg["return_value"]
        sold_qty = agg["sold_qty"]
        sold_value = agg["sold_value"]
        balance_qty = agg["total_stock"]

        unit = _unit_price(product, valuation_mode)
        balance_value = (balance_qty * unit).quantize(_MONEY)

        branch_stocks = []
        for br in branches:
            bid = br["branch_id"]
            bq = agg["branch_qty"].get(bid, Decimal("0"))
            branch_stocks.append(
                {
                    "branch_id": bid,
                    "branch_name": br["branch_name"],
                    "quantity": str(bq.quantize(_QTY)),
                }
            )
            totals["branch_qty"][bid] += bq

        rows.append(
            {
                "product_id": pid,
                "season_id": str(product.season_id) if product.season_id else "",
                "season_name": product.season.name_ar if product.season_id else "—",
                "supplier_id": str(product.supplier_id) if product.supplier_id else "",
                "supplier_name": product.supplier.name_ar if product.supplier_id else "—",
                "supplier_whatsapp": product.supplier.whatsapp if product.supplier_id else "",
                "product_code": product.code,
                "product_name": product.name_ar,
                "product_description": product.description or "",
                "brand_name": product.brand.name_ar if product.brand_id else "—",
                "section_name": product.section.name_ar if product.section_id else "—",
                "classification_name": (
                    product.classification.name_ar if product.classification_id else "—"
                ),
                "purchase_price": str((product.purchase_price or Decimal("0")).quantize(_MONEY)),
                "sale_price": str((product.sale_price or Decimal("0")).quantize(_MONEY)),
                "wholesale_price": str(
                    (product.offer_price or product.sale_price or Decimal("0")).quantize(_MONEY)
                ),
                "purchased_qty": str(purchased_qty.quantize(_QTY)),
                "purchased_value": str(purchased_value.quantize(_MONEY)),
                "return_qty": str(return_qty.quantize(_QTY)),
                "return_value": str(return_value.quantize(_MONEY)),
                "sold_qty": str(sold_qty.quantize(_QTY)),
                "sold_value": str(sold_value.quantize(_MONEY)),
                "purchase_count": agg["purchase_count"],
                "branch_stocks": branch_stocks,
                "balance_qty": str(balance_qty.quantize(_QTY)),
                "balance_value": str(balance_value),
                "valuation_unit_price": str(unit.quantize(_MONEY)),
            }
        )

        totals["purchased_qty"] += purchased_qty
        totals["purchased_value"] += purchased_value
        totals["return_qty"] += return_qty
        totals["return_value"] += return_value
        totals["sold_qty"] += sold_qty
        totals["sold_value"] += sold_value
        totals["balance_qty"] += balance_qty
        totals["balance_value"] += balance_value

    rows.sort(key=lambda r: (r["supplier_name"], r["product_code"]))

    supplier_whatsapp = ""
    supplier_name = ""
    if supplier_id and rows:
        supplier_whatsapp = rows[0].get("supplier_whatsapp") or ""
        supplier_name = rows[0].get("supplier_name") or ""
    elif supplier_id:
        from erp.supplier_models import Supplier

        try:
            sup = Supplier.objects.using(_USING).get(pk=supplier_id)
            supplier_whatsapp = sup.whatsapp or ""
            supplier_name = sup.name_ar
        except Supplier.DoesNotExist:
            pass

    period_label = ""
    if d_from and d_to:
        period_label = f"{d_from} → {d_to}"
    elif d_from:
        period_label = f"من {d_from}"
    elif d_to:
        period_label = f"حتى {d_to}"
    else:
        period_label = "كل الفترات"

    wa_payload = {
        "supplier_name": supplier_name,
        "supplier_whatsapp": supplier_whatsapp,
        "period_label": period_label,
        "totals": {
            "purchased_qty": str(totals["purchased_qty"].quantize(_QTY)),
            "sold_qty": str(totals["sold_qty"].quantize(_QTY)),
            "balance_qty": str(totals["balance_qty"].quantize(_QTY)),
            "balance_value": str(totals["balance_value"].quantize(_MONEY)),
        },
    }

    return _serialize_response(
        branches=branches,
        rows=rows,
        totals=totals,
        filters=_filter_meta(branch_id, supplier_id, valuation_mode, d_from, d_to, season_id),
        whatsapp=whatsapp_url_for_inventory(wa_payload),
        supplier_whatsapp=supplier_whatsapp,
        supplier_name=supplier_name,
        period_label=period_label,
    )


def _filter_meta(branch_id, supplier_id, valuation_mode, d_from, d_to, season_id):
    return {
        "branch_id": branch_id or "",
        "supplier_id": supplier_id or "",
        "season_id": season_id or "",
        "date_from": d_from.isoformat() if d_from else "",
        "date_to": d_to.isoformat() if d_to else "",
        "valuation_mode": valuation_mode,
    }


def _serialize_response(
    *,
    branches: list,
    rows: list,
    totals: dict,
    filters: dict,
    whatsapp: str | None,
    supplier_whatsapp: str = "",
    supplier_name: str = "",
    period_label: str = "",
) -> dict:
    ser_totals = {
        "purchased_qty": str(totals["purchased_qty"].quantize(_QTY)),
        "purchased_value": str(totals["purchased_value"].quantize(_MONEY)),
        "return_qty": str(totals["return_qty"].quantize(_QTY)),
        "return_value": str(totals["return_value"].quantize(_MONEY)),
        "sold_qty": str(totals["sold_qty"].quantize(_QTY)),
        "sold_value": str(totals["sold_value"].quantize(_MONEY)),
        "balance_qty": str(totals["balance_qty"].quantize(_QTY)),
        "balance_value": str(totals["balance_value"].quantize(_MONEY)),
        "branch_qty": {
            k: str(v.quantize(_QTY)) for k, v in totals["branch_qty"].items()
        },
    }
    return {
        "branches": branches,
        "rows": rows,
        "totals": ser_totals,
        "filters": filters,
        "whatsapp_url": whatsapp,
        "supplier_whatsapp": supplier_whatsapp,
        "supplier_name": supplier_name,
        "period_label": period_label,
    }
