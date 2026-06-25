"""خدمات نقطة البيع — البيع من الفرع النشط فقط."""

from __future__ import annotations

import json
import re
from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from rest_framework.exceptions import ValidationError

from erp.branch_context import get_branch_sale_warehouse
from erp.models import Branch, BranchWarehouse, InventorySettings
from erp.product_models import CompositeProduct, Product, ProductVariant, StockBalance
from erp.services.okazion_notice import get_branch_offer_price
from django.utils import timezone

from erp.accounting_models import Treasury, TreasuryMovement
from erp.sale_models import Sale, SaleLine, SalePayment, SaleReturn
from erp.services import catalog as catalog_service
from erp.services.catalog import get_current_season
from erp.services import stock as stock_service
from erp.services.stock import _adjust_balance
from erp.services.supplier_account import post_sale_supplier_entries
from tenancy.context import get_current_tenant


DEFAULT_VAT_PERCENT = Decimal("14.00")


def _parse_legacy_delivery_fee(notes: str) -> Decimal:
    m = re.search(r"delivery:([\d.]+)", notes or "")
    if not m:
        return Decimal("0")
    try:
        return Decimal(m.group(1))
    except Exception:
        return Decimal("0")


def effective_delivery_fee(sale: Sale) -> Decimal:
    if sale.delivery_fee and sale.delivery_fee > 0:
        return sale.delivery_fee
    return _parse_legacy_delivery_fee(sale.notes)


def _sale_is_delivery(sale: Sale) -> bool:
    if sale.is_delivery:
        return True
    notes = sale.notes or ""
    return "delivery-invoice" in notes or "delivery:" in notes


def _compute_line_commission(
    *,
    line_total: Decimal,
    seller_id,
    product: Product | None,
    basis: str,
) -> Decimal:
    if not seller_id or line_total <= 0:
        return Decimal("0")
    if basis == InventorySettings.PosCommissionBasis.PRODUCT:
        markup = product.markup_percent if product else Decimal("0")
        rate = markup if markup > 0 else Decimal("1")
        return (line_total * rate / Decimal("100")).quantize(Decimal("0.01"))
    from erp.hr_structure_models import EmployeeProfile

    profile = (
        EmployeeProfile.objects.using("tenant")
        .filter(user_id=seller_id)
        .first()
    )
    if not profile:
        return (line_total * Decimal("0.01")).quantize(Decimal("0.01"))
    if profile.commission_mode == EmployeeProfile.CommissionMode.PERCENT:
        return (line_total * profile.commission_percent / Decimal("100")).quantize(Decimal("0.01"))
    if profile.commission_mode == EmployeeProfile.CommissionMode.PER_THOUSAND:
        return (line_total / Decimal("1000") * profile.commission_per_1000).quantize(Decimal("0.01"))
    return Decimal("0")


def _record_seller_commission(*, seller_id, line_total: Decimal, commission: Decimal, sale_code: str) -> None:
    if not seller_id or commission <= 0:
        return
    from erp.hr_payroll_models import EmployeeCommissionRecord

    EmployeeCommissionRecord.objects.using("tenant").create(
        employee_id=seller_id,
        period_type=EmployeeCommissionRecord.PeriodType.DAILY,
        period_date=timezone.localdate(),
        sales_amount=line_total,
        commission_amount=commission,
        notes=f"بيع POS {sale_code}",
    )


def _create_sale_line_record(
    *,
    sale: Sale,
    qty: Decimal,
    unit_price: Decimal,
    discount_percent: Decimal,
    seller_id=None,
    product: Product | None = None,
    variant=None,
    composite=None,
) -> SaleLine:
    settings = InventorySettings.objects.using("tenant").get_or_create(pk=1)[0]
    line_total = _line_total(qty, unit_price, discount_percent)
    commission = _compute_line_commission(
        line_total=line_total,
        seller_id=seller_id,
        product=product,
        basis=settings.pos_commission_basis,
    )
    ln = SaleLine.objects.using("tenant").create(
        sale=sale,
        variant=variant,
        composite_product=composite,
        quantity=qty,
        unit_price=unit_price,
        discount_percent=discount_percent,
        line_total=line_total,
        seller_id=seller_id,
        line_commission=commission,
    )
    _record_seller_commission(
        seller_id=seller_id,
        line_total=line_total,
        commission=commission,
        sale_code=sale.code,
    )
    return ln


def _line_total(qty: Decimal, unit_price: Decimal, discount_percent: Decimal) -> Decimal:
    gross = qty * unit_price
    if discount_percent > 0:
        gross = gross * (Decimal("1") - discount_percent / Decimal("100"))
    return gross.quantize(Decimal("0.01"))


def resolve_pos_seller(*, code: str):
    from erp.models import User

    c = (code or "").strip()
    if not c:
        raise ValidationError("رقم البائع مطلوب.")
    qs = User.objects.using("tenant").filter(is_active=True)
    user = qs.filter(employee_code__iexact=c).first()
    if not user:
        user = qs.filter(username__iexact=c).first()
    if not user:
        raise ValidationError("البائع غير موجود أو غير نشط.")
    return user


def list_pos_sellers() -> list[dict]:
    from erp.models import User

    rows = (
        User.objects.using("tenant")
        .filter(is_active=True)
        .order_by("employee_code", "username")[:500]
    )
    out = []
    for u in rows:
        code = (u.employee_code or u.username or "").strip()
        name = (u.full_name or u.username or code or "موظف").strip()
        if not code and not name:
            continue
        out.append(
            {
                "id": str(u.id),
                "employee_code": code or str(u.id)[:8],
                "full_name": name,
                "username": u.username or "",
            }
        )
    return out


def _sale_qr_payload(sale: Sale) -> str:
    tenant = get_current_tenant()
    payload = {
        "invoice_type": "tax_invoice" if sale.is_tax_invoice else "sales_invoice",
        "eta_ready": sale.is_tax_invoice,
        "invoice_number": sale.code,
        "issued_at": sale.created_at.isoformat() if sale.created_at else timezone.now().isoformat(),
        "seller": {
            "name": tenant.name if tenant else "",
            "tax_registration_number": sale.tax_registration_number,
            "branch": sale.branch.name_ar if sale.branch_id else "",
            "branch_code": sale.branch.code if sale.branch_id else "",
            "address": sale.branch.address if sale.branch_id else "",
        },
        "buyer": {
            "name": sale.customer.name_ar if sale.customer_id else "عميل نقدي",
            "tax_registration_number": (
                (sale.customer.profile_data or {}).get("tax_registration_number", "")
                if sale.customer_id
                else ""
            ),
        },
        "subtotal": str(sale.subtotal),
        "discount": str(sale.discount_amount),
        "vat_rate": str(sale.tax_percent),
        "vat_amount": str(sale.tax_amount),
        "total": str(sale.total),
    }
    return json.dumps(payload, ensure_ascii=False)


def _payment_amounts(total: Decimal, payment_method: str, payments: list[dict], *, label: str = "الفاتورة") -> dict[str, Decimal]:
    total = Decimal(str(total)).quantize(Decimal("0.01"))
    if payments:
        rows: dict[str, Decimal] = {}
        for p in payments:
            method = p["payment_method"]
            amount = Decimal(str(p["amount"])).quantize(Decimal("0.01"))
            rows[method] = rows.get(method, Decimal("0")) + amount
        paid = sum(rows.values(), Decimal("0")).quantize(Decimal("0.01"))
        if abs(paid - total) > Decimal("0.01"):
            raise ValidationError(f"إجمالي المدفوعات ({paid}) لا يساوي المطلوب ({total}) — {label}.")
        if paid != total:
            diff = (total - paid).quantize(Decimal("0.01"))
            first_method = next(iter(rows))
            rows[first_method] = (rows[first_method] + diff).quantize(Decimal("0.01"))
        return rows
    return {payment_method: total}


def _post_cash_receipt(*, sale: Sale, amount: Decimal, user) -> None:
    if amount <= 0:
        return
    from erp.services.accounting_vouchers import ensure_default_treasuries
    from erp.services import accounting_treasury as treasury_service

    ensure_default_treasuries()
    treasury = (
        Treasury.objects.using("tenant")
        .filter(kind=Treasury.TreasuryKind.CASH, is_active=True)
        .order_by("code")
        .first()
    )
    if not treasury:
        return
    movement = treasury_service.create_treasury_movement(
        data={
            "movement_date": timezone.localdate(),
            "movement_type": TreasuryMovement.MovementType.RECEIPT,
            "treasury": str(treasury.pk),
            "amount": str(amount),
            "branch": str(sale.branch_id),
            "notes": f"تحصيل فاتورة مبيعات {sale.code}",
        },
        user=user,
    )
    treasury_service.post_treasury_movement(movement.pk, user)


def _store_sale_payments(*, sale: Sale, payments: list[dict], payment_amounts: dict[str, Decimal]) -> None:
    rows = payments or [
        {"payment_method": method, "amount": amount, "reference": ""}
        for method, amount in payment_amounts.items()
        if amount > 0
    ]
    for row in rows:
        SalePayment.objects.using("tenant").create(
            sale=sale,
            payment_method=row["payment_method"],
            amount=Decimal(str(row["amount"])),
            reference=(row.get("reference") or "").strip(),
        )


def get_pos_context(branch: Branch) -> dict:
    warehouse = get_branch_sale_warehouse(branch)
    return {
        "branch": {
            "id": str(branch.id),
            "code": branch.code,
            "name_ar": branch.name_ar,
            "name_en": branch.name_en,
        },
        "warehouse": {
            "id": str(warehouse.id),
            "code": warehouse.code,
            "name_ar": warehouse.name_ar,
        },
        "is_pos": True,
        "message_ar": "نقطة البيع = الفرع — لا يمكن إضافة فروع من هنا.",
        "message_en": "POS is your branch; branches come from your plan only.",
    }


def _branch_id_from_warehouse(warehouse_id) -> str | None:
    bw = (
        BranchWarehouse.objects.using("tenant")
        .filter(warehouse_id=warehouse_id)
        .order_by("-is_default")
        .first()
    )
    return str(bw.branch_id) if bw else None


def _variant_sale_and_offer(*, product, variant, branch_id) -> tuple[Decimal, Decimal | None, Decimal]:
    sale = Decimal(
        str(
            variant.sale_price
            if variant.sale_price is not None
            else product.sale_price
        )
    )
    offer = get_branch_offer_price(product=product, branch_id=branch_id) if branch_id else None
    if offer is None and product.offer_price:
        offer = Decimal(str(product.offer_price))
    offer_discount = Decimal("0")
    if offer is not None and offer > 0 and sale > offer:
        offer_discount = (sale - offer).quantize(Decimal("0.01"))
    return sale, offer, offer_discount


def search_sellable_products(*, warehouse_id, season_id, query: str = "", barcode: str = ""):
    qs = (
        Product.objects.using("tenant")
        .filter(is_active=True)
        .select_related("brand", "season")
        .prefetch_related("variants__size", "variants__color", "variants__balances")
        .order_by("-season_id", "code")
    )
    if barcode:
        term = barcode.strip()
        qs = qs.filter(
            Q(barcode__iexact=term)
            | Q(variants__barcode__iexact=term)
            | Q(code__iexact=term)
        ).distinct()
    elif query.strip():
        parts = [p.strip() for p in query.split() if p.strip()]
        for part in parts:
            qs = qs.filter(
                Q(code__icontains=part)
                | Q(name_ar__icontains=part)
                | Q(name_en__icontains=part)
                | Q(barcode__icontains=part)
            )
    else:
        return Product.objects.none()

    results = []
    branch_id = _branch_id_from_warehouse(warehouse_id)
    for product in qs[:50]:
        variants_payload = []
        for variant in product.variants.filter(is_active=True):
            bal = (
                StockBalance.objects.using("tenant")
                .filter(warehouse_id=warehouse_id, variant=variant)
                .first()
            )
            qty = bal.quantity if bal else Decimal("0")
            total_available = qty + _other_warehouse_qty(warehouse_id, variant.id)
            # POS — عرض كل المقاسات/الألوان النشطة؛ التحقق من الرصيد عند الحفظ
            sale_price, offer_price, offer_discount = _variant_sale_and_offer(
                product=product, variant=variant, branch_id=branch_id
            )
            discount_pct = Decimal("0")
            if offer_discount > 0 and sale_price > 0:
                discount_pct = (offer_discount / sale_price * Decimal("100")).quantize(
                    Decimal("0.01")
                )
            variants_payload.append(
                {
                    "variant_id": str(variant.id),
                    "size_name": variant.size.name_ar,
                    "color_name": variant.color.name_ar,
                    "barcode": variant.barcode or product.barcode,
                    "quantity_available": str(total_available),
                    "branch_quantity_available": str(qty),
                    "unit_price": str(sale_price),
                    "sale_price": str(sale_price),
                    "offer_price": str(offer_price) if offer_price is not None else None,
                    "offer_discount_per_unit": str(offer_discount),
                    "discount_percent": str(discount_pct),
                }
            )
        if variants_payload:
            sale_p = Decimal(str(product.sale_price))
            offer_p = get_branch_offer_price(product=product, branch_id=branch_id) if branch_id else None
            results.append(
                {
                    "id": str(product.id),
                    "code": product.code,
                    "name_ar": product.name_ar,
                    "barcode": product.barcode,
                    "sale_price": str(product.sale_price),
                    "offer_price": str(offer_p) if offer_p is not None else None,
                    "season": str(product.season_id),
                    "season_name": product.season.name_ar,
                    "is_current_season": str(product.season_id) == str(season_id),
                    "variants": variants_payload,
                }
            )
    return results


def _other_warehouse_qty(warehouse_id, variant_id) -> Decimal:
    return (
        StockBalance.objects.using("tenant")
        .filter(variant_id=variant_id, quantity__gt=0, warehouse__is_active=True)
        .exclude(warehouse_id=warehouse_id)
        .aggregate(total=Sum("quantity"))["total"]
        or Decimal("0")
    )


def _balance_qty(warehouse_id, variant_id) -> Decimal:
    bal = (
        StockBalance.objects.using("tenant")
        .filter(warehouse_id=warehouse_id, variant_id=variant_id)
        .first()
    )
    return bal.quantity if bal else Decimal("0")


def _auto_transfer_to_branch_warehouse(*, branch, warehouse, variant_id, required_qty: Decimal, user) -> Decimal:
    """
    POS يبيع من مخزن الفرع فقط. عند نقص الرصيد نحول تلقائياً من أي مخزن لديه نفس الـ SKU.
    """
    available = _balance_qty(warehouse.id, variant_id)
    if available >= required_qty:
        return available

    missing = (required_qty - available).quantize(Decimal("0.001"))
    sources = (
        StockBalance.objects.using("tenant")
        .select_for_update()
        .select_related("warehouse")
        .filter(variant_id=variant_id, quantity__gt=0, warehouse__is_active=True)
        .exclude(warehouse_id=warehouse.id)
        .order_by("-quantity")
    )
    for source in sources:
        if missing <= 0:
            break
        move_qty = min(missing, source.quantity).quantize(Decimal("0.001"))
        transfer = stock_service.create_transfer(
            data={
                "transfer_type": "warehouse_branch",
                "from_warehouse": str(source.warehouse_id),
                "to_branch": str(branch.id),
                "requires_approval": False,
                "notes": "تحويل تلقائي من POS عند نقص رصيد منفذ البيع",
                "lines": [{"variant": str(variant_id), "quantity": str(move_qty)}],
            },
            user=user,
        )
        stock_service.approve_transfer(transfer.pk, user, skip_permission=True)
        missing -= move_qty

    return _balance_qty(warehouse.id, variant_id)


def _composite_max_sets(composite, *, warehouse_id) -> Decimal:
    """أقصى عدد «مجموعات عرض» متاحة حسب أضعف مكوّن."""
    sets: Decimal | None = None
    for line in composite.lines.select_related("variant").all():
        per_set = line.quantity
        if per_set <= 0:
            continue
        available = _balance_qty(warehouse_id, line.variant_id) + _other_warehouse_qty(
            warehouse_id, line.variant_id
        )
        possible = available // per_set
        sets = possible if sets is None else min(sets, possible)
    return sets if sets is not None else Decimal("0")


def search_composite_bundles(*, warehouse_id, query: str = "", barcode: str = ""):
    qs = (
        CompositeProduct.objects.using("tenant")
        .filter(is_active=True)
        .prefetch_related(
            "lines__variant__product",
            "lines__variant__size",
            "lines__variant__color",
        )
    )
    if barcode:
        qs = qs.filter(
            Q(barcode__iexact=barcode.strip()) | Q(code__iexact=barcode.strip())
        )
    elif query.strip():
        parts = [p.strip() for p in query.split() if p.strip()]
        for part in parts:
            qs = qs.filter(
                Q(code__icontains=part)
                | Q(name_ar__icontains=part)
                | Q(name_en__icontains=part)
                | Q(barcode__icontains=part)
            )
    else:
        return []

    results = []
    for composite in qs[:30]:
        components = []
        for line in composite.lines.all():
            avail = _balance_qty(warehouse_id, line.variant_id)
            components.append(
                {
                    "variant_id": str(line.variant_id),
                    "product_code": line.variant.product.code,
                    "product_name": line.variant.product.name_ar,
                    "size_name": line.variant.size.name_ar,
                    "color_name": line.variant.color.name_ar,
                    "quantity_per_set": str(line.quantity),
                    "quantity_available": str(avail),
                }
            )
        unit_price = composite.offer_price if composite.offer_price is not None else composite.sale_price
        results.append(
            {
                "id": str(composite.id),
                "code": composite.code,
                "name_ar": composite.name_ar,
                "barcode": composite.barcode,
                "sale_price": str(composite.sale_price),
                "offer_price": str(composite.offer_price) if composite.offer_price is not None else None,
                "unit_price": str(unit_price),
                "max_sets_available": str(_composite_max_sets(composite, warehouse_id=warehouse_id)),
                "components": components,
            }
        )
    return results


def search_pos_catalog(*, warehouse_id, season_id, query: str = "", barcode: str = ""):
    return {
        "products": search_sellable_products(
            warehouse_id=warehouse_id,
            season_id=season_id,
            query=query,
            barcode=barcode,
        ),
        "composites": search_composite_bundles(
            warehouse_id=warehouse_id,
            query=query,
            barcode=barcode,
        ),
    }


def list_in_stock_products(*, warehouse_id, season_id, limit: int = 36):
    """أصناف لها رصيد في منفذ البيع — للاختيار السريع من شاشة POS."""
    balances = (
        StockBalance.objects.using("tenant")
        .filter(warehouse_id=warehouse_id, quantity__gt=0)
        .select_related(
            "variant__product__brand",
            "variant__product__season",
            "variant__size",
            "variant__color",
        )
        .order_by("-quantity")[: limit * 4]
    )
    by_product: dict = {}
    for bal in balances:
        variant = bal.variant
        product = variant.product
        if not product.is_active or not variant.is_active:
            continue
        pid = str(product.id)
        if pid not in by_product:
            by_product[pid] = {
                "id": pid,
                "code": product.code,
                "name_ar": product.name_ar,
                "barcode": product.barcode,
                "sale_price": str(product.sale_price),
                "season": str(product.season_id),
                "season_name": product.season.name_ar,
                "is_current_season": str(product.season_id) == str(season_id),
                "variants": [],
            }
        total_available = bal.quantity + _other_warehouse_qty(warehouse_id, variant.id)
        by_product[pid]["variants"].append(
            {
                "variant_id": str(variant.id),
                "size_name": variant.size.name_ar,
                "color_name": variant.color.name_ar,
                "barcode": variant.barcode or product.barcode,
                "quantity_available": str(total_available),
                "branch_quantity_available": str(bal.quantity),
                "unit_price": str(
                    variant.sale_price if variant.sale_price is not None else product.sale_price
                ),
            }
        )
        if len(by_product) >= limit:
            break
    return list(by_product.values())


def _resolve_sale_season(lines_data: list[dict]):
    season = get_current_season()
    season_ids = set()
    for row in lines_data:
        if row.get("variant"):
            variant = ProductVariant.objects.using("tenant").select_related("product").get(pk=row["variant"])
            season_ids.add(variant.product.season_id)
        elif row.get("composite"):
            composite = (
                CompositeProduct.objects.using("tenant")
                .prefetch_related("lines__variant__product")
                .get(pk=row["composite"], is_active=True)
            )
            for line in composite.lines.all():
                season_ids.add(line.variant.product.season_id)
    if len(season_ids) == 1:
        from erp.models import Season

        return Season.objects.using("tenant").get(pk=next(iter(season_ids)))
    return season


def _deduct_component_stock(*, branch, warehouse, season, composite, sets_qty: Decimal, user) -> None:
    for line in composite.lines.select_related("variant__product").all():
        variant = line.variant
        if not variant.is_active:
            raise ValidationError(f"مكوّن العرض غير نشط: {variant.product.code}")
        needed = sets_qty * line.quantity
        available = _auto_transfer_to_branch_warehouse(
            branch=branch,
            warehouse=warehouse,
            variant_id=variant.id,
            required_qty=needed,
            user=user,
        )
        if needed > available:
            raise ValidationError(
                f"الكمية غير كافية لمكوّن العرض {variant.product.name_ar} "
                f"({variant.size.name_ar}/{variant.color.name_ar}) — المتاح: {available} "
                f"(مطلوب للعرض: {needed})"
            )
        _adjust_balance(warehouse.id, variant.id, -needed)


@transaction.atomic(using="tenant")
def create_sale(*, branch: Branch, user, data: dict) -> Sale:
    from erp.accounting_models import ShiftMovement
    from erp.services.accounting_vouchers import (
        assert_pos_shift_open,
        get_open_shift_for_user,
        link_sale_to_open_shift,
        record_shift_movement_on_shift,
    )

    assert_pos_shift_open(user)
    open_shift = get_open_shift_for_user(user)
    lines_data = data.get("lines") or []
    if not lines_data:
        raise ValidationError("أضف صنفًا واحدًا على الأقل للبيع.")

    settings = InventorySettings.objects.using("tenant").get_or_create(pk=1)[0]
    if settings.pos_require_seller_on_scan:
        for idx, row in enumerate(lines_data, start=1):
            if not row.get("seller"):
                raise ValidationError(f"رقم البائع مطلوب للصنف رقم {idx}.")

    warehouse = get_branch_sale_warehouse(branch)
    season = _resolve_sale_season(lines_data)
    is_tax_invoice = bool(data.get("is_tax_invoice"))
    tax_registration_number = (data.get("tax_registration_number") or "").strip()
    tax_percent = Decimal(str(data.get("tax_percent") or 0))
    if is_tax_invoice:
        if not tax_registration_number:
            raise ValidationError("الفاتورة الضريبية تحتاج الرقم الضريبي للشركة.")
        if tax_percent <= 0:
            tax_percent = DEFAULT_VAT_PERCENT

    code = catalog_service._next_code("SL", Sale)
    delivery_fee = Decimal(str(data.get("delivery_fee") or 0))
    notes = (data.get("notes") or "").strip()
    is_delivery = bool(data.get("is_delivery")) or delivery_fee > 0 or "delivery-invoice" in notes
    delivery_agent_id = data.get("delivery_agent")
    delivery_status = ""
    if is_delivery:
        delivery_status = (
            Sale.DeliveryStatus.DELIVERED
            if delivery_agent_id
            else Sale.DeliveryStatus.PENDING
        )
    sale = Sale.objects.using("tenant").create(
        code=code,
        branch=branch,
        warehouse=warehouse,
        season=season,
        payment_method=data.get("payment_method", Sale.PaymentMethod.CASH),
        notes=notes,
        discount_amount=Decimal(str(data.get("discount_amount") or 0)),
        tax_percent=tax_percent,
        is_tax_invoice=is_tax_invoice,
        tax_registration_number=tax_registration_number,
        customer_id=data.get("customer"),
        created_by=user,
        cash_shift=open_shift,
        status=Sale.Status.COMPLETED,
        is_delivery=is_delivery,
        delivery_fee=delivery_fee,
        delivery_agent_id=delivery_agent_id,
        delivery_status=delivery_status,
    )

    for row in lines_data:
        qty = Decimal(str(row["quantity"]))
        discount_percent = Decimal(str(row.get("discount_percent") or 0))

        composite_id = row.get("composite")
        if composite_id:
            composite = (
                CompositeProduct.objects.using("tenant")
                .prefetch_related("lines__variant__product")
                .get(pk=composite_id, is_active=True)
            )
            unit_price = Decimal(
                str(
                    row.get("unit_price")
                    or (
                        composite.offer_price
                        if composite.offer_price is not None
                        else composite.sale_price
                    )
                )
            )
            max_sets = _composite_max_sets(composite, warehouse_id=warehouse.id)
            if qty > max_sets:
                raise ValidationError(
                    f"الكمية غير كافية للعرض {composite.name_ar} — المتاح: {max_sets} مجموعة"
                )
            _create_sale_line_record(
                sale=sale,
                composite=composite,
                qty=qty,
                unit_price=unit_price,
                discount_percent=discount_percent,
                seller_id=row.get("seller"),
                product=None,
            )
            _deduct_component_stock(
                branch=branch,
                warehouse=warehouse,
                season=season,
                composite=composite,
                sets_qty=qty,
                user=user,
            )
            continue

        variant = (
            ProductVariant.objects.using("tenant")
            .select_related("product")
            .get(pk=row["variant"], is_active=True)
        )
        unit_price = Decimal(str(row.get("unit_price") or variant.product.sale_price))

        available = _auto_transfer_to_branch_warehouse(
            branch=branch,
            warehouse=warehouse,
            variant_id=variant.id,
            required_qty=qty,
            user=user,
        )
        if qty > available:
            elsewhere = (
                StockBalance.objects.using("tenant")
                .filter(variant_id=variant.id, quantity__gt=0)
                .exclude(warehouse_id=warehouse.id)
            )
            other_total = sum((row.quantity for row in elsewhere), Decimal("0"))
            raise ValidationError(
                f"الكمية غير كافية للصنف {variant.product.name_ar} "
                f"({variant.size.name_ar}/{variant.color.name_ar}) — المتاح في منفذ البيع "
                f"«{warehouse.name_ar}»: {available}، وفي مخازن أخرى: {other_total}"
            )

        _create_sale_line_record(
            sale=sale,
            variant=variant,
            qty=qty,
            unit_price=unit_price,
            discount_percent=discount_percent,
            seller_id=row.get("seller"),
            product=variant.product,
        )
        _adjust_balance(warehouse.id, variant.id, -qty)

    lines = sale.lines.all()
    subtotal = sum((ln.line_total for ln in lines), Decimal("0"))
    sale.subtotal = subtotal
    taxable = max(subtotal - sale.discount_amount, Decimal("0"))
    sale.tax_amount = (taxable * sale.tax_percent / Decimal("100")).quantize(Decimal("0.01"))
    sale.total = (taxable + sale.tax_amount).quantize(Decimal("0.01"))
    if delivery_fee > 0:
        sale.total = (sale.total + delivery_fee).quantize(Decimal("0.01"))
    sale.commission_amount = sum((ln.line_commission for ln in lines), Decimal("0")).quantize(
        Decimal("0.01")
    )
    sale.cashier_points = int(sale.total // Decimal("100"))
    sale.qr_payload = _sale_qr_payload(sale)
    payments = data.get("payments") or []
    is_installment = data.get("payment_method") == Sale.PaymentMethod.INSTALLMENT
    installment_plan_id = data.get("installment_plan")
    down_payment_target = sale.total
    if is_installment:
        if not sale.customer_id:
            raise ValidationError("يجب اختيار عميل للتقسيط.")
        if not installment_plan_id:
            raise ValidationError("يجب اختيار نظام التقسيط.")
        from erp.receivable_models import InstallmentPlanTemplate
        from erp.services.receivables import _installment_calculation

        plan = InstallmentPlanTemplate.objects.using("tenant").get(
            pk=installment_plan_id, is_active=True
        )
        calc_data: dict = {}
        if data.get("down_payment_amount") is not None:
            calc_data["down_payment_amount"] = str(data["down_payment_amount"])
        calc = _installment_calculation(principal=sale.total, plan=plan, data=calc_data)
        down_payment_target = calc["down_payment_amount"]
    payment_amounts = _payment_amounts(
        down_payment_target if is_installment else sale.total,
        sale.payment_method,
        payments,
        label="المقدم" if is_installment else "الفاتورة",
    )
    if len(payment_amounts) > 1 and not is_installment:
        sale.payment_method = Sale.PaymentMethod.MIXED
    sale.save(
        using="tenant",
        update_fields=[
            "subtotal",
            "tax_amount",
            "total",
            "commission_amount",
            "cashier_points",
            "qr_payload",
            "payment_method",
            "is_delivery",
            "delivery_fee",
            "delivery_agent",
            "delivery_status",
        ],
    )
    _store_sale_payments(sale=sale, payments=payments, payment_amounts=payment_amounts)
    post_sale_supplier_entries(sale)
    from erp.services import banking_channels as channels_service

    _post_cash_receipt(
        sale=sale,
        amount=payment_amounts.get(Sale.PaymentMethod.CASH, Decimal("0")),
        user=user,
    )
    cash_amt = payment_amounts.get(Sale.PaymentMethod.CASH, Decimal("0"))
    link_sale_to_open_shift(user, sale)
    if open_shift:
        record_shift_movement_on_shift(
            open_shift,
            ShiftMovement.MovementType.SALE,
            cash_amt,
            reference=sale.code,
        )
    channels_service.record_sale_card(
        sale=sale,
        user=user,
        data={**data, "card_amount": str(payment_amounts.get(Sale.PaymentMethod.CARD, Decimal("0")))},
    )
    channels_service.record_sale_wallet(
        sale=sale,
        user=user,
        data={**data, "wallet_amount": str(payment_amounts.get(Sale.PaymentMethod.WALLET, Decimal("0")))},
    )
    installment_receipt = None
    if is_installment:
        from erp.services.receivables import create_pos_installment_from_sale

        installment_receipt = create_pos_installment_from_sale(
            sale=sale,
            user=user,
            data={
                "installment_plan": installment_plan_id,
                "down_payment_amount": data.get("down_payment_amount"),
                "num_installments": data.get("num_installments"),
            },
        )
        sale._installment_receipt = installment_receipt  # noqa: SLF001 — للتسلسل
    return sale


def _credit_installment_exchange_difference(*, customer_id, amount: Decimal, user, note: str) -> None:
    from erp.customer_models import Customer
    from erp.receivable_models import InstallmentLine

    if amount <= 0:
        return
    customer = Customer.objects.using("tenant").get(pk=customer_id)
    customer.balance_due = max((customer.balance_due or Decimal("0")) - amount, Decimal("0"))
    customer.save(using="tenant", update_fields=["balance_due"])
    remaining = amount
    lines = (
        InstallmentLine.objects.using("tenant")
        .select_related("contract")
        .filter(contract__customer_id=customer_id)
        .exclude(status__in=[InstallmentLine.Status.PAID, InstallmentLine.Status.CANCELLED])
        .order_by("-due_date", "-sequence")
    )
    for ln in lines:
        if remaining <= 0:
            break
        reducible = min(ln.balance, remaining)
        if reducible <= 0:
            continue
        ln.amount_due = (ln.amount_due - reducible).quantize(Decimal("0.01"))
        if ln.amount_due <= ln.amount_paid:
            ln.status = InstallmentLine.Status.PAID
        ln.save(using="tenant", update_fields=["amount_due", "status"])
        remaining -= reducible


@transaction.atomic(using="tenant")
def create_pos_exchange(*, branch: Branch, user, data: dict) -> dict:
    """تبديل بضاعة — مرتجع من فاتورة/فواتير + بيع جديد + تسوية الفرق."""
    from erp.services import sales as sales_service

    settings = InventorySettings.objects.using("tenant").get_or_create(pk=1)[0]
    return_lines = data.get("return_lines") or []
    new_lines = data.get("new_lines") or []

    if settings.pos_force_return_from_invoice and not return_lines:
        raise ValidationError("يجب تحديد فاتورة المرتجع وفق إعدادات النظام.")
    if not return_lines and not new_lines:
        raise ValidationError("أضف مرتجعاً أو أصنافاً جديدة على الأقل.")

    customer_id = data.get("customer")
    original_payment = Sale.PaymentMethod.CASH
    by_sale: dict[str, list] = {}
    for row in return_lines:
        sid = str(row["sale"])
        by_sale.setdefault(sid, []).append(row)

    return_total = Decimal("0")
    return_codes: list[str] = []

    for sale_id, rows in by_sale.items():
        sale_obj = Sale.objects.using("tenant").select_related("customer").get(pk=sale_id)
        if not customer_id and sale_obj.customer_id:
            customer_id = str(sale_obj.customer_id)
        original_payment = sale_obj.payment_method
        refund_method = (
            SaleReturn.RefundMethod.CUSTOMER_ACCOUNT
            if original_payment == Sale.PaymentMethod.INSTALLMENT
            else data.get("refund_method") or SaleReturn.RefundMethod.CASH
        )
        ret = sales_service.create_sale_return(
            sale_id=sale_id,
            data={
                "lines": [
                    {"sale_line": r["sale_line"], "quantity": r["quantity"]} for r in rows
                ],
                "refund_method": refund_method,
                "reason": (data.get("reason") or "تبديل بضاعة").strip(),
                "notes": (data.get("notes") or "").strip(),
            },
            user=user,
        )
        return_codes.append(ret.code)
        return_total += ret.total

    new_sale = None
    new_total = Decimal("0")
    if new_lines:
        pay_method = data.get("payment_method") or original_payment or Sale.PaymentMethod.CASH
        new_sale = create_sale(
            branch=branch,
            user=user,
            data={
                "payment_method": pay_method,
                "customer": customer_id,
                "discount_amount": data.get("discount_amount") or "0",
                "lines": new_lines,
                "payments": data.get("payments") or [],
                "notes": f"تبديل — مرتجع: {', '.join(return_codes) if return_codes else '—'}",
            },
        )
        new_total = new_sale.total

    difference = (new_total - return_total).quantize(Decimal("0.01"))
    settlement_ar = "تبديل متوازن"
    settlement_en = "Balanced exchange"

    if difference > 0:
        settlement_ar = f"على العميل دفع فرق: {difference}"
        settlement_en = f"Customer pays difference: {difference}"
        if customer_id and original_payment == Sale.PaymentMethod.INSTALLMENT:
            from erp.services.receivables import collect_installment_payment

            collect_installment_payment(
                customer_id=customer_id,
                amount=difference,
                method=data.get("difference_payment_method") or "cash",
                reference=f"exchange:{','.join(return_codes)}",
                user=user,
            )
    elif difference < 0:
        credit = abs(difference)
        settlement_ar = f"للعميل رصيد/استرداد فرق: {credit}"
        settlement_en = f"Customer credit/refund: {credit}"
        if customer_id and original_payment == Sale.PaymentMethod.INSTALLMENT:
            _credit_installment_exchange_difference(
                customer_id=customer_id,
                amount=credit,
                user=user,
                note=f"فرق تبديل {','.join(return_codes)}",
            )

    return {
        "return_codes": return_codes,
        "sale_code": new_sale.code if new_sale else None,
        "return_total": str(return_total),
        "new_total": str(new_total),
        "difference": str(difference),
        "settlement_ar": settlement_ar,
        "settlement_en": settlement_en,
        "original_payment_method": original_payment,
        "customer_id": customer_id,
    }


def list_delivery_orders(
    *,
    branch: Branch,
    search: str = "",
    date_from=None,
    date_to=None,
    agent_id=None,
    status: str = "",
    limit: int = 200,
) -> dict:
    qs = (
        Sale.objects.using("tenant")
        .filter(branch=branch, status=Sale.Status.COMPLETED)
        .filter(
            Q(is_delivery=True)
            | Q(notes__icontains="delivery-invoice")
            | Q(notes__icontains="delivery:")
        )
        .select_related("customer", "delivery_agent", "created_by", "branch")
        .prefetch_related(
            "lines__variant__product",
            "lines__variant__size",
            "lines__variant__color",
            "lines__composite_product",
            "lines__seller",
        )
        .order_by("-created_at")
    )
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    if agent_id:
        qs = qs.filter(delivery_agent_id=agent_id)
    if status:
        qs = qs.filter(delivery_status=status)
    search = (search or "").strip()
    if search:
        qs = qs.filter(
            Q(code__icontains=search)
            | Q(customer__name_ar__icontains=search)
            | Q(customer__phone__icontains=search)
            | Q(delivery_agent__full_name__icontains=search)
            | Q(delivery_agent__employee_code__icontains=search)
        )
    rows = list(qs[: max(1, min(limit, 500))])
    total_fees = sum((effective_delivery_fee(s) for s in rows), Decimal("0"))
    return {
        "orders": rows,
        "summary": {
            "count": len(rows),
            "total_delivery_fees": str(total_fees.quantize(Decimal("0.01"))),
        },
    }


@transaction.atomic(using="tenant")
def update_delivery_order(*, sale_id, user, data: dict) -> Sale:
    sale = (
        Sale.objects.using("tenant")
        .select_related("branch", "customer", "delivery_agent", "created_by")
        .prefetch_related(
            "lines__variant__product",
            "lines__variant__size",
            "lines__variant__color",
            "lines__composite_product",
            "lines__seller",
        )
        .get(pk=sale_id)
    )
    if not _sale_is_delivery(sale):
        raise ValidationError("هذه الفاتورة ليست فاتورة دليفري.")
    update_fields: list[str] = []
    if "delivery_agent" in data:
        sale.delivery_agent_id = data.get("delivery_agent")
        update_fields.append("delivery_agent")
    if "delivery_status" in data:
        status = (data.get("delivery_status") or "").strip()
        if status and status not in Sale.DeliveryStatus.values:
            raise ValidationError("حالة التوصيل غير صالحة.")
        sale.delivery_status = status
        update_fields.append("delivery_status")
    if not sale.is_delivery:
        sale.is_delivery = True
        update_fields.append("is_delivery")
    fee = effective_delivery_fee(sale)
    if fee > 0 and sale.delivery_fee <= 0:
        sale.delivery_fee = fee
        update_fields.append("delivery_fee")
    if update_fields:
        sale.save(using="tenant", update_fields=update_fields)
    return sale
