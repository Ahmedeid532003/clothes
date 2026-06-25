"""تقييم مخزن، جرد، أصناف مركبة، تعديل أسعار، باركود."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.product_models import (
    CompositeProduct,
    CompositeProductLine,
    PriceAdjustment,
    Product,
    ProductVariant,
    StockBalance,
    StockCount,
    StockCountLine,
)
from erp.services import catalog as catalog_service
from erp.services.stock import _adjust_balance
from erp.services.stock import approve_addition, approve_disbursement, create_addition, create_disbursement
from erp.supplier_models import SupplierAccountEntry


def _variant_unit_price(variant: ProductVariant, field: str) -> Decimal:
    val = getattr(variant, field, None)
    if val is not None:
        return Decimal(str(val))
    prod_val = getattr(variant.product, field, None)
    if prod_val is not None:
        return Decimal(str(prod_val))
    return Decimal("0")


def stock_valuation_report(
    *,
    warehouse_id=None,
    season_id=None,
    merge_by_product: bool = False,
):
    qs = (
        StockBalance.objects.using("tenant")
        .filter(quantity__gt=0)
        .select_related(
            "warehouse",
            "variant__product__season",
            "variant__size",
            "variant__color",
        )
    )
    if warehouse_id:
        qs = qs.filter(warehouse_id=warehouse_id)
    if season_id:
        qs = qs.filter(variant__product__season_id=season_id)

    rows = []
    totals = {
        "quantity": Decimal("0"),
        "purchase_value": Decimal("0"),
        "sale_value": Decimal("0"),
        "offer_value": Decimal("0"),
    }

    if merge_by_product:
        grouped: dict = {}
        for bal in qs:
            pid = str(bal.variant.product_id)
            if pid not in grouped:
                p = bal.variant.product
                grouped[pid] = {
                    "product_id": pid,
                    "product_code": p.code,
                    "product_name": p.name_ar,
                    "warehouse_code": bal.warehouse.code if warehouse_id else "",
                    "warehouse_name": bal.warehouse.name_ar if warehouse_id else "",
                    "quantity": Decimal("0"),
                    "purchase_price": _variant_unit_price(bal.variant, "purchase_price"),
                    "sale_price": _variant_unit_price(bal.variant, "sale_price"),
                    "offer_price": _variant_unit_price(bal.variant, "offer_price"),
                }
            grouped[pid]["quantity"] += bal.quantity or Decimal("0")
        for row in grouped.values():
            qty = row["quantity"]
            row["purchase_value"] = (qty * row["purchase_price"]).quantize(Decimal("0.01"))
            offer = row["offer_price"] or row["sale_price"]
            row["offer_price"] = offer
            row["sale_value"] = (qty * row["sale_price"]).quantize(Decimal("0.01"))
            row["offer_value"] = (qty * offer).quantize(Decimal("0.01"))
            rows.append(row)
            totals["quantity"] += qty
            totals["purchase_value"] += row["purchase_value"]
            totals["sale_value"] += row["sale_value"]
            totals["offer_value"] += row["offer_value"]
    else:
        for bal in qs:
            v = bal.variant
            purchase = _variant_unit_price(v, "purchase_price")
            sale = _variant_unit_price(v, "sale_price")
            offer = _variant_unit_price(v, "offer_price") or sale
            qty = bal.quantity or Decimal("0")
            row = {
                "balance_id": str(bal.id),
                "warehouse_code": bal.warehouse.code,
                "warehouse_name": bal.warehouse.name_ar,
                "product_code": v.product.code,
                "product_name": v.product.name_ar,
                "size_name": v.size.name_ar,
                "color_name": v.color.name_ar,
                "quantity": qty,
                "purchase_price": purchase,
                "sale_price": sale,
                "offer_price": offer,
                "purchase_value": (qty * purchase).quantize(Decimal("0.01")),
                "sale_value": (qty * sale).quantize(Decimal("0.01")),
                "offer_value": (qty * offer).quantize(Decimal("0.01")),
            }
            rows.append(row)
            totals["quantity"] += qty
            totals["purchase_value"] += row["purchase_value"]
            totals["sale_value"] += row["sale_value"]
            totals["offer_value"] += row["offer_value"]

    for k in totals:
        totals[k] = totals[k].quantize(Decimal("0.01"))

    return {"rows": rows, "totals": totals}


def _order_qty_map(scan_order_id) -> dict:
    from erp.scan_order_models import ScanOrderLine

    rows = (
        ScanOrderLine.objects.using("tenant")
        .filter(scan_order_id=scan_order_id)
        .values("variant_id")
        .annotate(total=Sum("quantity"))
    )
    return {str(r["variant_id"]): r["total"] or Decimal("0") for r in rows}


def _balances_for_count_filters(*, warehouse_id, filters: dict):
    qs = (
        StockBalance.objects.using("tenant")
        .filter(warehouse_id=warehouse_id, quantity__gt=0)
        .select_related("variant__product__supplier")
    )
    supplier_group_id = filters.get("supplier_group")
    supplier_id = filters.get("supplier")
    section_id = filters.get("section")
    brand_id = filters.get("brand")
    classification_id = filters.get("classification")
    product_id = filters.get("product")

    if supplier_group_id:
        qs = qs.filter(variant__product__supplier__supplier_group_id=supplier_group_id)
    elif supplier_id:
        qs = qs.filter(variant__product__supplier_id=supplier_id)
    if section_id:
        qs = qs.filter(variant__product__section_id=section_id)
    if brand_id:
        qs = qs.filter(variant__product__brand_id=brand_id)
    if classification_id:
        qs = qs.filter(variant__product__classification_id=classification_id)
    if product_id:
        qs = qs.filter(variant__product_id=product_id)
    return qs


def _balance_qty(warehouse_id, variant_id) -> Decimal:
    bal = (
        StockBalance.objects.using("tenant")
        .filter(warehouse_id=warehouse_id, variant_id=variant_id)
        .first()
    )
    return bal.quantity if bal else Decimal("0")


def _build_count_lines(*, count: StockCount, data: dict) -> None:
    warehouse_id = count.warehouse_id
    count_mode = data.get("count_mode") or count.count_mode or StockCount.CountMode.FILTER
    scan_order_id = data.get("scan_order") or (count.scan_order_id if count.scan_order_id else None)
    lines_in = data.get("lines")

    if lines_in:
        for row in lines_in:
            StockCountLine.objects.using("tenant").create(
                stock_count=count,
                variant_id=row["variant"],
                system_qty=Decimal(str(row.get("system_qty", 0))),
                counted_qty=Decimal(str(row.get("counted_qty", 0))),
            )
        return

    order_map = _order_qty_map(scan_order_id) if scan_order_id else {}

    if count_mode == StockCount.CountMode.ORDER:
        if not order_map:
            raise ValidationError("أوردر الجرد مطلوب في وضع أصناف الأوردر.")
        for variant_id, qty in order_map.items():
            StockCountLine.objects.using("tenant").create(
                stock_count=count,
                variant_id=variant_id,
                system_qty=_balance_qty(warehouse_id, variant_id),
                counted_qty=qty,
            )
        return

    filters = {
        "supplier": data.get("supplier") or count.supplier_id,
        "supplier_group": data.get("supplier_group") or count.supplier_group_id,
        "section": data.get("section") or count.section_id,
        "brand": data.get("brand") or count.brand_id,
        "classification": data.get("classification") or count.classification_id,
        "product": data.get("product") or count.product_id,
    }
    balances = _balances_for_count_filters(warehouse_id=warehouse_id, filters=filters)
    for bal in balances:
        vid = str(bal.variant_id)
        counted = order_map.get(vid, Decimal("0"))
        StockCountLine.objects.using("tenant").create(
            stock_count=count,
            variant_id=bal.variant_id,
            system_qty=bal.quantity,
            counted_qty=counted,
        )


@transaction.atomic(using="tenant")
def create_stock_count(*, data: dict, user) -> StockCount:
    warehouse_id = data["warehouse"]
    code = catalog_service._next_code("CNT", StockCount)
    count = StockCount.objects.using("tenant").create(
        code=code,
        branch_id=data.get("branch"),
        warehouse_id=warehouse_id,
        count_mode=data.get("count_mode") or StockCount.CountMode.FILTER,
        scan_order_id=data.get("scan_order"),
        supplier_id=data.get("supplier"),
        supplier_group_id=data.get("supplier_group"),
        section_id=data.get("section"),
        brand_id=data.get("brand"),
        classification_id=data.get("classification"),
        product_id=data.get("product"),
        notes=(data.get("notes") or "").strip(),
        status=StockCount.Status.DRAFT,
        created_by=user,
    )
    _build_count_lines(count=count, data=data)
    if not count.lines.exists():
        raise ValidationError("لا توجد أرصدة لجردها في هذا النطاق.")
    return count


@transaction.atomic(using="tenant")
def apply_scan_order_to_count(*, count_id, scan_order_id) -> StockCount:
    from erp.scan_order_models import ScanOrder

    count = (
        StockCount.objects.using("tenant")
        .select_for_update()
        .prefetch_related("lines")
        .get(pk=count_id, status=StockCount.Status.DRAFT)
    )
    order = ScanOrder.objects.using("tenant").prefetch_related("lines").get(pk=scan_order_id)
    if order.order_type != ScanOrder.OrderType.STOCK_COUNT:
        raise ValidationError("نوع الأوردر لا يطابق الجرد.")
    order_map = _order_qty_map(scan_order_id)
    count.scan_order_id = scan_order_id
    count.save(using="tenant", update_fields=["scan_order_id"])

    if count.count_mode == StockCount.CountMode.ORDER:
        count.lines.all().delete()
        for variant_id, qty in order_map.items():
            StockCountLine.objects.using("tenant").create(
                stock_count=count,
                variant_id=variant_id,
                system_qty=_balance_qty(count.warehouse_id, variant_id),
                counted_qty=qty,
            )
    else:
        for line in count.lines.all():
            vid = str(line.variant_id)
            if vid in order_map:
                line.counted_qty = order_map[vid]
                line.save(using="tenant", update_fields=["counted_qty"])
            else:
                line.counted_qty = Decimal("0")
                line.save(using="tenant", update_fields=["counted_qty"])
    return count


@transaction.atomic(using="tenant")
def approve_stock_count(count_id, *, user=None) -> StockCount:
    count = (
        StockCount.objects.using("tenant")
        .select_for_update()
        .prefetch_related("lines")
        .get(pk=count_id)
    )
    if count.status != StockCount.Status.DRAFT:
        raise ValidationError("لا يمكن اعتماد هذا الجرد.")

    surplus_lines = []
    shortage_lines = []
    for line in count.lines.all():
        delta = line.counted_qty - line.system_qty
        if delta > 0:
            surplus_lines.append({"variant": line.variant_id, "quantity": delta})
        elif delta < 0:
            shortage_lines.append({"variant": line.variant_id, "quantity": abs(delta)})

    note_ref = f"تسوية جرد {count.code}"
    if surplus_lines and user:
        addition = create_addition(
            data={
                "warehouse": count.warehouse_id,
                "purpose": "other",
                "notes": note_ref,
                "lines": surplus_lines,
            },
            user=user,
        )
        approve_addition(addition.id)
        count.addition_voucher_id = addition.id
    if shortage_lines and user:
        disbursement = create_disbursement(
            data={
                "warehouse": count.warehouse_id,
                "purpose": "other",
                "notes": note_ref,
                "lines": shortage_lines,
            },
            user=user,
        )
        approve_disbursement(disbursement.id)
        count.disbursement_voucher_id = disbursement.id

    if not user:
        for line in count.lines.all():
            delta = line.counted_qty - line.system_qty
            if delta != 0:
                _adjust_balance(count.warehouse_id, line.variant_id, delta)

    count.status = StockCount.Status.APPROVED
    count.approved_at = timezone.now()
    count.save(
        using="tenant",
        update_fields=["status", "approved_at", "addition_voucher_id", "disbursement_voucher_id"],
    )
    return count


@transaction.atomic(using="tenant")
def undo_stock_count(count_id) -> StockCount:
    count = (
        StockCount.objects.using("tenant")
        .select_for_update()
        .prefetch_related("lines")
        .get(pk=count_id)
    )
    if count.status != StockCount.Status.APPROVED:
        raise ValidationError("لا يمكن التراجع إلا عن جرد معتمد.")

    for line in count.lines.all():
        delta = line.counted_qty - line.system_qty
        if delta != 0:
            _adjust_balance(count.warehouse_id, line.variant_id, -delta)

    count.status = StockCount.Status.DRAFT
    count.approved_at = None
    count.addition_voucher_id = None
    count.disbursement_voucher_id = None
    count.save(
        using="tenant",
        update_fields=[
            "status",
            "approved_at",
            "addition_voucher_id",
            "disbursement_voucher_id",
        ],
    )
    return count


@transaction.atomic(using="tenant")
def delete_stock_count(count_id) -> None:
    count = StockCount.objects.using("tenant").get(pk=count_id)
    if count.status != StockCount.Status.DRAFT:
        raise ValidationError("لا يمكن حذف جرد معتمد.")
    count.delete()


@transaction.atomic(using="tenant")
def cancel_stock_count(count_id) -> StockCount:
    count = StockCount.objects.using("tenant").select_for_update().get(pk=count_id)
    if count.status == StockCount.Status.APPROVED:
        raise ValidationError("لا يمكن إلغاء جرد معتمد.")
    count.status = StockCount.Status.CANCELLED
    count.save(using="tenant", update_fields=["status"])
    return count


@transaction.atomic(using="tenant")
def create_composite(*, data: dict) -> CompositeProduct:
    lines = data.get("lines") or []
    if not lines:
        raise ValidationError("أضف مكوّنًا واحدًا على الأقل للعرض.")

    code = (data.get("code") or "").strip() or catalog_service._next_code("BDL", CompositeProduct)
    composite = CompositeProduct.objects.using("tenant").create(
        code=code,
        barcode=(data.get("barcode") or "").strip(),
        name_ar=data["name_ar"].strip(),
        name_en=(data.get("name_en") or data["name_ar"]).strip(),
        sale_price=Decimal(str(data.get("sale_price") or 0)),
        offer_price=(
            Decimal(str(data["offer_price"]))
            if data.get("offer_price") not in (None, "")
            else None
        ),
        is_active=bool(data.get("is_active", True)),
    )
    for row in lines:
        CompositeProductLine.objects.using("tenant").create(
            composite=composite,
            variant_id=row["variant"],
            quantity=Decimal(str(row.get("quantity", 1))),
        )
    return composite


@transaction.atomic(using="tenant")
def update_composite(composite_id, *, data: dict) -> CompositeProduct:
    composite = CompositeProduct.objects.using("tenant").get(pk=composite_id)
    for field in ("barcode", "name_ar", "name_en", "is_active"):
        if field in data:
            setattr(composite, field, data[field])
    if "sale_price" in data:
        composite.sale_price = Decimal(str(data["sale_price"]))
    if "offer_price" in data:
        composite.offer_price = (
            Decimal(str(data["offer_price"])) if data["offer_price"] not in (None, "") else None
        )
    composite.save(using="tenant")

    if "lines" in data:
        CompositeProductLine.objects.using("tenant").filter(composite=composite).delete()
        for row in data["lines"]:
            CompositeProductLine.objects.using("tenant").create(
                composite=composite,
                variant_id=row["variant"],
                quantity=Decimal(str(row.get("quantity", 1))),
            )
    return composite


def _adjustment_product_queryset(data: dict):
    scope = data.get("scope", PriceAdjustment.Scope.CARD)
    qs = Product.objects.using("tenant").filter(is_active=True).select_related(
        "supplier", "season", "brand", "section"
    )
    if scope == PriceAdjustment.Scope.SUPPLIER:
        supplier_id = data.get("supplier")
        if not supplier_id:
            raise ValidationError("المورد مطلوب لتعديل أسعار حساب المورد.")
        qs = qs.filter(supplier_id=supplier_id)
    elif data.get("supplier"):
        qs = qs.filter(supplier_id=data["supplier"])
    if data.get("supplier_group"):
        qs = qs.filter(supplier__supplier_group_id=data["supplier_group"])
    if data.get("season"):
        qs = qs.filter(season_id=data["season"])
    if data.get("brand"):
        qs = qs.filter(brand_id=data["brand"])
    if data.get("section"):
        qs = qs.filter(section_id=data["section"])
    if data.get("classification"):
        qs = qs.filter(classification_id=data["classification"])
    if data.get("q"):
        q = data["q"].strip()
        qs = qs.filter(
            Q(code__icontains=q)
            | Q(name_ar__icontains=q)
            | Q(name_en__icontains=q)
            | Q(barcode__icontains=q)
        )
    return qs


def _normalize_adjustment_data(data: dict) -> dict:
    """يربط النطاق بالحقل الصحيح: كارت = بيع فقط، مورد = تكلفة فقط."""
    data = dict(data)
    scope = data.get("scope", PriceAdjustment.Scope.CARD)
    if scope == PriceAdjustment.Scope.SUPPLIER:
        data["target"] = PriceAdjustment.Target.PURCHASE
    else:
        data["target"] = PriceAdjustment.Target.SALE
    return data


def _adjustment_price_field(data: dict) -> str:
    data = _normalize_adjustment_data(data)
    target = data["target"]
    if target == PriceAdjustment.Target.PURCHASE:
        return "purchase_price"
    if target == PriceAdjustment.Target.OFFER:
        return "offer_price"
    return "sale_price"


def _variant_stock_qty(variant_id) -> Decimal:
    total = (
        StockBalance.objects.using("tenant")
        .filter(variant_id=variant_id, quantity__gt=0)
        .aggregate(total=Sum("quantity"))["total"]
    )
    return Decimal(str(total or 0))


def _product_stock_qty(product: Product) -> Decimal:
    total = (
        StockBalance.objects.using("tenant")
        .filter(variant__product_id=product.id, quantity__gt=0)
        .aggregate(total=Sum("quantity"))["total"]
    )
    return Decimal(str(total or 0))


def _product_account_delta(
    product: Product,
    *,
    price_field: str,
    mode: str,
    direction: str,
    value: Decimal,
) -> Decimal:
    """فرق قيمة المخزون = (سعر جديد − سعر قديم) × الكمية لكل متغير."""
    delta = Decimal("0")
    variants = list(product.variants.filter(is_active=True))
    if not variants:
        old = Decimal(str(getattr(product, price_field) or 0))
        new = _apply_price_change(old, mode=mode, direction=direction, value=value)
        return ((new - old) * _product_stock_qty(product)).quantize(Decimal("0.01"))

    for variant in variants:
        old = _variant_unit_price(variant, price_field)
        new = _apply_price_change(old, mode=mode, direction=direction, value=value)
        qty = _variant_stock_qty(variant.id)
        delta += (new - old) * qty
    return delta.quantize(Decimal("0.01"))


def preview_price_adjustment(*, data: dict) -> dict:
    data = _normalize_adjustment_data(data)
    scope = data["scope"]
    mode = data.get("mode", PriceAdjustment.Mode.PERCENT)
    direction = data.get("direction", PriceAdjustment.Direction.DECREASE)
    value = Decimal(str(data["value"]))
    price_field = _adjustment_price_field(data)

    products = list(_adjustment_product_queryset(data).order_by("code")[:500])
    rows = []
    total_account_delta = Decimal("0")
    for product in products:
        current = getattr(product, price_field) or Decimal("0")
        current = Decimal(str(current))
        new_price = _apply_price_change(
            current, mode=mode, direction=direction, value=value
        )
        stock_qty = _product_stock_qty(product)
        account_delta = Decimal("0")
        if scope == PriceAdjustment.Scope.SUPPLIER:
            account_delta = _product_account_delta(
                product,
                price_field=price_field,
                mode=mode,
                direction=direction,
                value=value,
            )
            total_account_delta += account_delta
        rows.append(
            {
                "product_id": str(product.id),
                "code": product.code,
                "name_ar": product.name_ar,
                "supplier_name": product.supplier.name_ar if product.supplier_id else "",
                "current_price": str(current.quantize(Decimal("0.01"))),
                "new_price": str(new_price),
                "stock_qty": str(stock_qty.quantize(Decimal("0.001"))),
                "account_delta": str(account_delta),
            }
        )
    result = {"count": len(rows), "rows": rows}
    if scope == PriceAdjustment.Scope.SUPPLIER:
        result["supplier_account_delta"] = str(total_account_delta.quantize(Decimal("0.01")))
    return result


def _apply_price_change(current: Decimal, *, mode: str, direction: str, value: Decimal) -> Decimal:
    if mode == PriceAdjustment.Mode.PERCENT:
        factor = value / Decimal("100")
        delta = current * factor
    else:
        delta = value
    if direction == PriceAdjustment.Direction.DECREASE:
        new_price = current - delta
    else:
        new_price = current + delta
    return max(new_price, Decimal("0")).quantize(Decimal("0.01"))


@transaction.atomic(using="tenant")
def apply_price_adjustment(*, data: dict, user) -> PriceAdjustment:
    data = _normalize_adjustment_data(data)
    scope = data["scope"]
    target = data["target"]
    mode = data.get("mode", PriceAdjustment.Mode.PERCENT)
    direction = data.get("direction", PriceAdjustment.Direction.DECREASE)
    value = Decimal(str(data["value"]))

    products = list(_adjustment_product_queryset(data))
    if not products:
        raise ValidationError("لا توجد أصناف مطابقة للفلاتر.")

    price_field = _adjustment_price_field(data)
    supplier_account_delta = Decimal("0")

    for product in products:
        current = getattr(product, price_field) or Decimal("0")
        new_price = _apply_price_change(
            Decimal(str(current)), mode=mode, direction=direction, value=value
        )
        if scope == PriceAdjustment.Scope.SUPPLIER:
            supplier_account_delta += _product_account_delta(
                product,
                price_field=price_field,
                mode=mode,
                direction=direction,
                value=value,
            )

        setattr(product, price_field, new_price)
        fields_to_save = [price_field, "updated_at"]
        if price_field == "sale_price" and product.purchase_price:
            product.markup_percent = catalog_service.compute_markup_percent(
                product.purchase_price, new_price
            )
            fields_to_save.append("markup_percent")
        elif price_field == "purchase_price" and product.markup_percent:
            product.sale_price = catalog_service.compute_sale_price(
                new_price, product.markup_percent
            )
            fields_to_save.extend(["sale_price", "markup_percent"])
        product.save(using="tenant", update_fields=list(dict.fromkeys(fields_to_save)))

        for variant in product.variants.filter(is_active=True):
            v_current = _variant_unit_price(variant, price_field)
            v_new = _apply_price_change(v_current, mode=mode, direction=direction, value=value)
            setattr(variant, price_field, v_new)
            variant.save(using="tenant", update_fields=[price_field])

    code = catalog_service._next_code("PA", PriceAdjustment)
    adjustment = PriceAdjustment.objects.using("tenant").create(
        code=code,
        scope=scope,
        target=target,
        mode=mode,
        direction=direction,
        value=value,
        supplier_id=data.get("supplier"),
        season_id=data.get("season"),
        brand_id=data.get("brand"),
        section_id=data.get("section"),
        offer_starts_at=data.get("offer_starts_at"),
        offer_ends_at=data.get("offer_ends_at"),
        products_affected=len(products),
        supplier_account_amount=(
            supplier_account_delta.quantize(Decimal("0.01"))
            if scope == PriceAdjustment.Scope.SUPPLIER
            else None
        ),
        created_by=user,
    )

    if scope == PriceAdjustment.Scope.SUPPLIER and supplier_account_delta != 0:
        entry_type = (
            SupplierAccountEntry.EntryType.DEBIT
            if supplier_account_delta > 0
            else SupplierAccountEntry.EntryType.CREDIT
        )
        entry_code = catalog_service._next_code("SA", SupplierAccountEntry)
        SupplierAccountEntry.objects.using("tenant").create(
            code=entry_code,
            supplier_id=data["supplier"],
            price_adjustment=adjustment,
            entry_type=entry_type,
            amount=abs(supplier_account_delta).quantize(Decimal("0.01")),
            notes=f"إشعار تعديل أسعار {adjustment.code}",
        )

    return adjustment


def _label_row(variant: ProductVariant, *, warehouse_id=None, default_qty=None) -> dict | None:
    barcode = (variant.barcode or variant.product.barcode or "").strip()
    if not barcode:
        return None
    qty = default_qty
    if qty is None:
        qty = Decimal("1")
        if warehouse_id:
            bal = (
                StockBalance.objects.using("tenant")
                .filter(warehouse_id=warehouse_id, variant=variant)
                .first()
            )
            qty = bal.quantity if bal else Decimal("0")
    return {
        "variant_id": str(variant.id),
        "product_code": variant.product.code,
        "product_name": variant.product.name_ar,
        "size_name": variant.size.name_ar,
        "color_name": variant.color.name_ar,
        "barcode": barcode,
        "sale_price": str(_variant_unit_price(variant, "sale_price")),
        "offer_price": str(_variant_unit_price(variant, "offer_price")),
        "quantity": str(qty.quantize(Decimal("0.001")) if isinstance(qty, Decimal) else qty),
    }


def barcode_labels(
    *,
    warehouse_id=None,
    q: str = "",
    product_id=None,
    purchase_invoice_id=None,
    price_adjustment_id=None,
    limit: int = 500,
):
    from erp.purchase_models import PurchaseInvoice, PurchaseInvoiceLine

    labels: list[dict] = []
    seen: set[str] = set()

    def add_variant(variant, default_qty=None):
        if str(variant.id) in seen:
            return
        row = _label_row(variant, warehouse_id=warehouse_id, default_qty=default_qty)
        if row:
            seen.add(str(variant.id))
            labels.append(row)

    if purchase_invoice_id:
        try:
            invoice = PurchaseInvoice.objects.using("tenant").get(pk=purchase_invoice_id)
        except PurchaseInvoice.DoesNotExist:
            raise ValidationError("فاتورة الشراء غير موجودة.")
        if warehouse_id and str(invoice.warehouse_id) != str(warehouse_id):
            warehouse_id = str(invoice.warehouse_id)
        lines = (
            PurchaseInvoiceLine.objects.using("tenant")
            .filter(invoice=invoice)
            .select_related("variant__product", "variant__size", "variant__color")
        )
        for line in lines:
            add_variant(line.variant, default_qty=line.quantity)
        return labels[:limit]

    if price_adjustment_id:
        try:
            adj = PriceAdjustment.objects.using("tenant").get(pk=price_adjustment_id)
        except PriceAdjustment.DoesNotExist:
            raise ValidationError("إشعار التعديل غير موجود.")
        data = {
            "scope": adj.scope,
            "target": adj.target,
            "mode": adj.mode,
            "direction": adj.direction,
            "value": adj.value,
            "supplier": str(adj.supplier_id) if adj.supplier_id else None,
            "season": str(adj.season_id) if adj.season_id else None,
            "brand": str(adj.brand_id) if adj.brand_id else None,
            "section": str(adj.section_id) if adj.section_id else None,
        }
        products = _adjustment_product_queryset(data)
        variants = (
            ProductVariant.objects.using("tenant")
            .filter(product__in=products, is_active=True)
            .select_related("product", "size", "color")
        )
        price_field = "offer_price" if adj.target == PriceAdjustment.Target.OFFER else "sale_price"
        for variant in variants:
            row = _label_row(variant, warehouse_id=warehouse_id)
            if row:
                row["sale_price"] = str(_variant_unit_price(variant, price_field))
                if str(variant.id) not in seen:
                    seen.add(str(variant.id))
                    labels.append(row)
        return labels[:limit]

    qs = (
        ProductVariant.objects.using("tenant")
        .filter(is_active=True, product__is_active=True)
        .select_related("product", "size", "color")
    )
    if product_id:
        qs = qs.filter(product_id=product_id)
    if q.strip():
        qs = qs.filter(
            Q(barcode__icontains=q.strip())
            | Q(product__barcode__icontains=q.strip())
            | Q(product__code__icontains=q.strip())
            | Q(product__name_ar__icontains=q.strip())
        )
    if warehouse_id:
        qs = qs.filter(balances__warehouse_id=warehouse_id).distinct()

    for variant in qs[:limit]:
        add_variant(variant)
    return labels
