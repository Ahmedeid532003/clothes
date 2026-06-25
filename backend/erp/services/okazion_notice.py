"""إشعار خصم الأوكازيون — معاينة، تطبيق، قائمة، وباركود."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from rest_framework.exceptions import ValidationError

from erp.models import Branch, BranchWarehouse
from erp.product_models import (
    BranchOfferPrice,
    OkazionNoticeLine,
    PriceAdjustment,
    Product,
    ProductVariant,
    StockBalance,
)
from erp.supplier_models import SupplierAccountEntry
from erp.services import catalog as catalog_service
from erp.services.inventory_extended import (
    _apply_price_change,
    _product_stock_qty,
    _variant_unit_price,
)

_USING = "tenant"
_MONEY = Decimal("0.01")


def _line_map(lines: list | None) -> dict:
    out = {}
    for row in lines or []:
        pid = str(row.get("product_id") or "")
        if pid:
            out[pid] = row
    return out


def _branch_warehouse_ids(branch_id) -> list:
    if not branch_id:
        return []
    return list(
        BranchWarehouse.objects.using(_USING)
        .filter(branch_id=branch_id)
        .values_list("warehouse_id", flat=True)
    )


def _variant_branch_qty(variant_id, branch_id) -> Decimal:
    """إجمالي رصيد المتغير في كل مخازن الفرع."""
    wh_ids = _branch_warehouse_ids(branch_id)
    if not wh_ids:
        return Decimal("0")
    total = (
        StockBalance.objects.using(_USING)
        .filter(variant_id=variant_id, warehouse_id__in=wh_ids, quantity__gt=0)
        .aggregate(total=Sum("quantity"))["total"]
    )
    return Decimal(str(total or 0))


def _product_stock_qty_for_branch(product: Product, branch_id=None) -> Decimal:
    if not branch_id:
        return _product_stock_qty(product)
    wh_ids = _branch_warehouse_ids(branch_id)
    if not wh_ids:
        return Decimal("0")
    total = (
        StockBalance.objects.using(_USING)
        .filter(variant__product_id=product.id, warehouse_id__in=wh_ids, quantity__gt=0)
        .aggregate(total=Sum("quantity"))["total"]
    )
    return Decimal(str(total or 0))


def _effective_offer_price(product: Product, branch_id=None) -> Decimal | None:
    if branch_id:
        bo = (
            BranchOfferPrice.objects.using(_USING)
            .filter(branch_id=branch_id, product=product)
            .first()
        )
        if bo and bo.offer_price is not None:
            return Decimal(str(bo.offer_price))
    if product.offer_price is not None and product.offer_price > 0:
        return Decimal(str(product.offer_price))
    return None


def get_branch_offer_price(*, product: Product, branch_id) -> Decimal | None:
    """سعر العرض الفعّال لفرع — للاستخدام من POS."""
    return _effective_offer_price(product, branch_id)


def _product_queryset(data: dict):
    supplier_id = data.get("supplier")
    season_id = data.get("season")
    if not supplier_id:
        raise ValidationError("المورد مطلوب.")
    if not season_id:
        raise ValidationError("الموسم مطلوب.")

    qs = (
        Product.objects.using(_USING)
        .filter(is_active=True, supplier_id=supplier_id, season_id=season_id)
        .select_related("supplier", "season", "brand", "section", "classification")
    )
    if data.get("brand"):
        qs = qs.filter(brand_id=data["brand"])
    if data.get("section"):
        qs = qs.filter(section_id=data["section"])
    if data.get("classification"):
        qs = qs.filter(classification_id=data["classification"])
    if data.get("q"):
        q = str(data["q"]).strip()
        qs = qs.filter(
            Q(code__icontains=q)
            | Q(name_ar__icontains=q)
            | Q(name_en__icontains=q)
            | Q(barcode__icontains=q)
        )
    return qs.order_by("code")


def _calc_row(
    product: Product,
    *,
    override: dict,
    defaults: dict,
    branch_id=None,
) -> dict:
    excluded = override.get("excluded", False)
    if isinstance(excluded, str):
        excluded = excluded.lower() in ("1", "true", "yes")

    mode = override.get("mode") or defaults.get("mode") or PriceAdjustment.Mode.PERCENT
    value = Decimal(
        str(override.get("value") if override.get("value") is not None else defaults.get("value") or 0)
    )
    enabled = override.get("enabled", defaults.get("enabled", True))
    if isinstance(enabled, str):
        enabled = enabled.lower() not in ("0", "false", "no")

    old_purchase = Decimal(str(product.purchase_price or 0))
    old_sale = Decimal(str(product.sale_price or 0))
    stock_qty = _product_stock_qty_for_branch(product, branch_id)
    qty_raw = override.get("qty")
    if qty_raw not in (None, ""):
        stock_qty = Decimal(str(qty_raw))

    markup_raw = override.get("markup_percent")
    if markup_raw in (None, ""):
        markup_raw = defaults.get("markup_percent")
    if markup_raw in (None, ""):
        markup_percent = product.markup_percent or Decimal("0")
    else:
        markup_percent = Decimal(str(markup_raw))

    manual_offer_raw = override.get("new_offer_price")
    manual_offer = None
    if manual_offer_raw not in (None, ""):
        manual_offer = Decimal(str(manual_offer_raw))

    has_discount = enabled and value > 0 and not excluded
    if has_discount:
        new_purchase = _apply_price_change(
            old_purchase,
            mode=mode,
            direction=PriceAdjustment.Direction.DECREASE,
            value=value,
        )
    else:
        new_purchase = old_purchase

    if manual_offer is not None and manual_offer > 0:
        new_offer = manual_offer
    elif has_discount:
        new_offer = catalog_service.compute_sale_price(new_purchase, markup_percent)
    else:
        new_offer = _effective_offer_price(product, branch_id) or old_sale

    unit_discount = max(old_purchase - new_purchase, Decimal("0")) if has_discount else Decimal("0")
    total_discount = (unit_discount * stock_qty).quantize(_MONEY)
    account_delta = Decimal("0")
    if has_discount:
        account_delta = (unit_discount * stock_qty).quantize(_MONEY)

    offer_discount_per_unit = max(old_sale - new_offer, Decimal("0")) if has_discount else Decimal("0")

    return {
        "product_id": str(product.id),
        "code": product.code,
        "barcode": product.barcode or "",
        "name_ar": product.name_ar,
        "brand_name": product.brand.name_ar if product.brand_id else "",
        "section_name": product.section.name_ar if product.section_id else "",
        "classification_name": product.classification.name_ar if product.classification_id else "",
        "supplier_name": product.supplier.name_ar if product.supplier_id else "",
        "stock_qty": str(stock_qty.quantize(Decimal("0.001"))),
        "qty": str(stock_qty.quantize(Decimal("0.001"))),
        "old_purchase_price": str(old_purchase.quantize(_MONEY)),
        "old_sale_price": str(old_sale.quantize(_MONEY)),
        "mode": mode,
        "value": str(value),
        "enabled": has_discount,
        "excluded": excluded,
        "has_discount": has_discount,
        "new_purchase_price": str(new_purchase.quantize(_MONEY)),
        "markup_percent": str(markup_percent.quantize(Decimal("0.01"))),
        "new_offer_price": str(new_offer.quantize(_MONEY)),
        "new_sale_price": str(old_sale.quantize(_MONEY)),
        "offer_discount_per_unit": str(offer_discount_per_unit.quantize(_MONEY)),
        "total_discount_value": str(total_discount),
        "account_delta": str(account_delta.quantize(_MONEY)),
    }


def preview_okazion_notice(*, data: dict) -> dict:
    defaults = {
        "mode": data.get("default_mode", PriceAdjustment.Mode.PERCENT),
        "value": data.get("default_value", "0"),
        "markup_percent": data.get("default_markup_percent"),
        "enabled": bool(data.get("default_enabled")),
    }
    overrides = _line_map(data.get("lines"))
    view_mode = data.get("view_mode") or "all"
    branch_id = data.get("branch_id")

    products = list(_product_queryset(data)[:800])
    rows = []
    total_discount = Decimal("0")
    total_account = Decimal("0")
    for product in products:
        row = _calc_row(
            product,
            override=overrides.get(str(product.id), {}),
            defaults=defaults,
            branch_id=branch_id,
        )
        if view_mode == "with_discount" and not row["has_discount"]:
            continue
        if view_mode == "without_discount" and row["has_discount"]:
            continue
        rows.append(row)
        if row["has_discount"]:
            total_discount += Decimal(row["total_discount_value"])
            total_account += Decimal(row["account_delta"])

    return {
        "count": len(rows),
        "total_discount_value": str(total_discount.quantize(_MONEY)),
        "supplier_account_delta": str(total_account.quantize(_MONEY)),
        "rows": rows,
    }


def list_okazion_notices(*, limit: int = 200) -> list[dict]:
    qs = (
        PriceAdjustment.objects.using(_USING)
        .filter(code__startswith="OKZ")
        .select_related("supplier", "season", "created_by")
        .order_by("-created_at")[:limit]
    )
    rows = []
    for adj in qs:
        user_name = ""
        if adj.created_by_id:
            user_name = adj.created_by.get_full_name() or adj.created_by.username
        rows.append(
            {
                "id": str(adj.id),
                "code": adj.code,
                "season_id": str(adj.season_id) if adj.season_id else "",
                "season_name": adj.season.name_ar if adj.season_id else "",
                "supplier_id": str(adj.supplier_id) if adj.supplier_id else "",
                "supplier_name": adj.supplier.name_ar if adj.supplier_id else "",
                "notice_date": adj.created_at.date().isoformat() if adj.created_at else "",
                "user_name": user_name,
                "total_value": str((adj.supplier_account_amount or Decimal("0")).quantize(_MONEY)),
                "products_affected": adj.products_affected,
            }
        )
    return rows


def get_okazion_notice(*, notice_id) -> dict:
    try:
        adj = (
            PriceAdjustment.objects.using(_USING)
            .select_related("supplier", "season", "created_by")
            .get(pk=notice_id, code__startswith="OKZ")
        )
    except PriceAdjustment.DoesNotExist:
        raise ValidationError("إشعار الأوكازيون غير موجود.")

    lines = (
        OkazionNoticeLine.objects.using(_USING)
        .filter(notice=adj, excluded=False)
        .select_related("product__brand", "product__section", "product__supplier")
        .order_by("product__code")
    )
    user_name = ""
    if adj.created_by_id:
        user_name = adj.created_by.get_full_name() or adj.created_by.username

    return {
        "id": str(adj.id),
        "code": adj.code,
        "season_id": str(adj.season_id) if adj.season_id else "",
        "season_name": adj.season.name_ar if adj.season_id else "",
        "supplier_id": str(adj.supplier_id) if adj.supplier_id else "",
        "supplier_name": adj.supplier.name_ar if adj.supplier_id else "",
        "notice_date": adj.created_at.date().isoformat() if adj.created_at else "",
        "user_name": user_name,
        "total_value": str((adj.supplier_account_amount or Decimal("0")).quantize(_MONEY)),
        "products_affected": adj.products_affected,
        "offer_starts_at": adj.offer_starts_at.isoformat() if adj.offer_starts_at else None,
        "offer_ends_at": adj.offer_ends_at.isoformat() if adj.offer_ends_at else None,
        "lines": [
            {
                "product_id": str(ln.product_id),
                "code": ln.product.code,
                "barcode": ln.product.barcode or "",
                "name_ar": ln.product.name_ar,
                "brand_name": ln.product.brand.name_ar if ln.product.brand_id else "",
                "supplier_name": ln.product.supplier.name_ar if ln.product.supplier_id else "",
                "qty": str(ln.qty),
                "mode": ln.mode,
                "value": str(ln.value),
                "markup_percent": str(ln.markup_percent),
                "old_purchase_price": str(ln.old_purchase_price),
                "new_purchase_price": str(ln.new_purchase_price),
                "old_sale_price": str(ln.old_sale_price),
                "new_offer_price": str(ln.new_offer_price),
                "total_discount_value": str(ln.total_discount_value),
            }
            for ln in lines
        ],
    }


def _scale_barcode(barcode: str, price: Decimal) -> str:
    """باركود موازين — PLU + سعر بالقرش (5 أرقام) + رقم تحقق EAN-13."""
    digits = "".join(c for c in barcode if c.isdigit())
    if len(digits) < 5:
        digits = digits.zfill(5)
    plu = digits[-5:]
    price_cents = int((price * 100).quantize(Decimal("1")))
    price_str = str(min(price_cents, 99999)).zfill(5)
    base = f"20{plu}{price_str}"
    if len(base) != 12:
        base = (base + "0" * 12)[:12]
    total = 0
    for i, ch in enumerate(base):
        n = int(ch)
        total += n * (3 if i % 2 else 1)
    check = (10 - (total % 10)) % 10
    return base + str(check)


@transaction.atomic(using=_USING)
def apply_okazion_notice(*, data: dict, user) -> dict:
    branch_id = data.get("branch_id")
    preview = preview_okazion_notice(data=data)
    rows = [r for r in preview["rows"] if r["has_discount"]]
    if not rows:
        raise ValidationError("لا توجد أصناف بخصم للتطبيق.")

    products_affected = 0
    supplier_account_delta = Decimal("0")
    total_discount = Decimal("0")

    avg_value = Decimal(str(data.get("default_value") or 0))
    code = catalog_service._next_code("OKZ", PriceAdjustment)
    adjustment = PriceAdjustment.objects.using(_USING).create(
        code=code,
        scope=PriceAdjustment.Scope.SUPPLIER,
        target=PriceAdjustment.Target.OFFER,
        mode=data.get("default_mode", PriceAdjustment.Mode.PERCENT),
        direction=PriceAdjustment.Direction.DECREASE,
        value=avg_value,
        supplier_id=data["supplier"],
        season_id=data["season"],
        brand_id=data.get("brand"),
        section_id=data.get("section"),
        offer_starts_at=data.get("offer_starts_at"),
        offer_ends_at=data.get("offer_ends_at"),
        products_affected=0,
        supplier_account_amount=Decimal("0"),
        created_by=user,
    )

    for row in rows:
        product = Product.objects.using(_USING).get(pk=row["product_id"])
        new_purchase = Decimal(row["new_purchase_price"])
        new_offer = Decimal(row["new_offer_price"])
        qty = Decimal(row["qty"])

        product.purchase_price = new_purchase
        if branch_id:
            BranchOfferPrice.objects.using(_USING).update_or_create(
                branch_id=branch_id,
                product=product,
                defaults={"offer_price": new_offer, "notice": adjustment},
            )
        else:
            product.offer_price = new_offer
            product.save(
                using=_USING,
                update_fields=["purchase_price", "offer_price", "updated_at"],
            )

        if branch_id:
            product.save(using=_USING, update_fields=["purchase_price", "updated_at"])

        for variant in product.variants.filter(is_active=True):
            variant.purchase_price = new_purchase
            if not branch_id:
                variant.offer_price = new_offer
                variant.save(
                    using=_USING,
                    update_fields=["purchase_price", "offer_price"],
                )
            else:
                variant.save(using=_USING, update_fields=["purchase_price"])

        OkazionNoticeLine.objects.using(_USING).create(
            notice=adjustment,
            product=product,
            qty=qty,
            mode=row["mode"],
            value=Decimal(row["value"]),
            markup_percent=Decimal(row["markup_percent"]),
            old_purchase_price=Decimal(row["old_purchase_price"]),
            new_purchase_price=new_purchase,
            old_sale_price=Decimal(row["old_sale_price"]),
            new_offer_price=new_offer,
            total_discount_value=Decimal(row["total_discount_value"]),
            excluded=False,
        )

        products_affected += 1
        supplier_account_delta += Decimal(row["account_delta"])
        total_discount += Decimal(row["total_discount_value"])

    adjustment.products_affected = products_affected
    adjustment.supplier_account_amount = supplier_account_delta.quantize(_MONEY)
    adjustment.save(
        using=_USING,
        update_fields=["products_affected", "supplier_account_amount"],
    )

    if supplier_account_delta != 0:
        entry_type = (
            SupplierAccountEntry.EntryType.DEBIT
            if supplier_account_delta > 0
            else SupplierAccountEntry.EntryType.CREDIT
        )
        entry_code = catalog_service._next_code("SA", SupplierAccountEntry)
        SupplierAccountEntry.objects.using(_USING).create(
            code=entry_code,
            supplier_id=data["supplier"],
            price_adjustment=adjustment,
            entry_type=entry_type,
            amount=abs(supplier_account_delta).quantize(_MONEY),
            notes=f"خصم أوكازيون {code}",
        )

    default_branch_id = branch_id
    if not default_branch_id:
        default_branch = (
            Branch.objects.using(_USING).filter(is_active=True).order_by("code").first()
        )
        default_branch_id = str(default_branch.id) if default_branch else None

    return {
        "id": str(adjustment.id),
        "code": adjustment.code,
        "products_affected": products_affected,
        "supplier_account_amount": str(supplier_account_delta.quantize(_MONEY)),
        "total_discount_value": str(total_discount.quantize(_MONEY)),
        "default_branch_id": default_branch_id,
        "rows": rows,
    }


def okazion_barcode_labels(
    *,
    notice_id,
    branch_id,
    warehouse_id=None,
    limit: int = 500,
) -> list[dict]:
    """باركود أوكازيون كبير — سعر بيع قديم مشطوب + سعر عرض جديد."""
    try:
        adj = PriceAdjustment.objects.using(_USING).get(pk=notice_id, code__startswith="OKZ")
    except PriceAdjustment.DoesNotExist:
        raise ValidationError("إشعار الأوكازيون غير موجود.")

    try:
        branch = Branch.objects.using(_USING).get(pk=branch_id, is_active=True)
    except Branch.DoesNotExist:
        raise ValidationError("الفرع غير موجود.")

    if not warehouse_id:
        bw = (
            BranchWarehouse.objects.using(_USING)
            .filter(branch_id=branch_id, is_default=True)
            .select_related("warehouse")
            .first()
        )
        if bw:
            warehouse_id = str(bw.warehouse_id)

    lines = (
        OkazionNoticeLine.objects.using(_USING)
        .filter(notice=adj, excluded=False)
        .select_related(
            "product__brand",
            "product__supplier",
            "product__section",
        )
    )

    labels: list[dict] = []
    for ln in lines:
        product = ln.product
        offer = ln.new_offer_price
        if branch_id:
            bo = (
                BranchOfferPrice.objects.using(_USING)
                .filter(branch_id=branch_id, product=product, notice=adj)
                .first()
            )
            if bo:
                offer = bo.offer_price

        variants = (
            ProductVariant.objects.using(_USING)
            .filter(product=product, is_active=True)
            .select_related("size", "color")
        )
        for variant in variants:
            barcode = (variant.barcode or product.barcode or "").strip()
            if not barcode:
                continue
            qty = _variant_branch_qty(variant.id, branch_id)
            if qty <= 0:
                continue

            old_sale = ln.old_sale_price
            variant_sale = _variant_unit_price(variant, "sale_price")
            if variant_sale > 0:
                old_sale = variant_sale
            labels.append(
                {
                    "variant_id": str(variant.id),
                    "product_code": product.code,
                    "product_name": product.name_ar,
                    "brand_name": product.brand.name_ar if product.brand_id else "",
                    "supplier_name": product.supplier.name_ar if product.supplier_id else "",
                    "section_name": product.section.name_ar if product.section_id else "",
                    "size_name": variant.size.name_ar,
                    "color_name": variant.color.name_ar,
                    "branch_name": branch.name_ar,
                    "barcode": barcode,
                    "scale_barcode": _scale_barcode(barcode, offer),
                    "sale_price": str(old_sale.quantize(_MONEY)),
                    "offer_price": str(offer.quantize(_MONEY)),
                    "quantity": str(qty.quantize(Decimal("0.001"))),
                    "label_kind": "okazion",
                }
            )
            if len(labels) >= limit:
                return labels
    return labels
