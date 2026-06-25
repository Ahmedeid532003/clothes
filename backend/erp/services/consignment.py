"""خدمات أمانات المحلات — حركات، أرصدة، لوحة، تقارير."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.consignment_models import (
    ConsignmentActivityLog,
    ConsignmentAuditLog,
    ConsignmentBalance,
    ConsignmentMovement,
    ConsignmentMovementLine,
)
from erp.customer_models import Customer
from erp.product_models import ProductVariant, StockBalance
from erp.services import catalog as catalog_service
from erp.services.stock import _adjust_balance

_USING = "tenant"
_QUANT = Decimal("0.001")
_MONEY = Decimal("0.01")

_PREFIX = {
    ConsignmentMovement.MovementType.SEND: "CSN",
    ConsignmentMovement.MovementType.RETURN: "CRT",
    ConsignmentMovement.MovementType.TRANSFER: "CTX",
    ConsignmentMovement.MovementType.COUNT: "CCT",
    ConsignmentMovement.MovementType.SETTLEMENT: "CST",
}


def _audit(entity_type: str, entity_id, action: str, summary: str, user=None, payload=None):
    ConsignmentAuditLog.objects.using(_USING).create(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        summary=summary[:500],
        user=user,
        payload=payload or {},
    )


def _activity(customer_id, movement_id, action: str, summary: str, user=None):
    ConsignmentActivityLog.objects.using(_USING).create(
        customer_id=customer_id,
        movement_id=movement_id,
        action=action,
        summary=summary[:500],
        user=user,
    )


def _get_or_create_balance(customer_id, variant_id, warehouse_id) -> ConsignmentBalance:
    bal, _ = ConsignmentBalance.objects.using(_USING).get_or_create(
        customer_id=customer_id,
        variant_id=variant_id,
        warehouse_id=warehouse_id,
        defaults={
            "qty_sent_total": Decimal("0"),
            "qty_returned_total": Decimal("0"),
            "qty_on_hand": Decimal("0"),
            "qty_sold": Decimal("0"),
        },
    )
    return bal


def _apply_balance_delta(bal: ConsignmentBalance, *, sent=Decimal("0"), returned=Decimal("0"), on_hand=Decimal("0")):
    bal.qty_sent_total = (bal.qty_sent_total + sent).quantize(_QUANT)
    bal.qty_returned_total = (bal.qty_returned_total + returned).quantize(_QUANT)
    bal.qty_on_hand = (bal.qty_on_hand + on_hand).quantize(_QUANT)
    if bal.qty_on_hand < 0:
        raise ValidationError(f"رصيد سالب للصنف {bal.variant_id}")
    bal.recalc_sold()
    bal.last_movement_at = timezone.now()
    bal.save(
        using=_USING,
        update_fields=[
            "qty_sent_total",
            "qty_returned_total",
            "qty_on_hand",
            "qty_sold",
            "last_movement_at",
            "updated_at",
        ],
    )


def _variant_snapshot(variant: ProductVariant) -> dict:
    return {
        "variant_id": str(variant.pk),
        "product_code": variant.product.code,
        "product_name": variant.product.name_ar,
        "size": variant.size.code,
        "color": variant.color.code,
        "barcode": variant.barcode or variant.product.barcode,
    }


def _serialize_line(line: ConsignmentMovementLine) -> dict:
    v = line.variant
    snap = _variant_snapshot(v)
    return {
        "id": str(line.pk),
        "variant": snap["variant_id"],
        "product_code": snap["product_code"],
        "product_name": snap["product_name"],
        "size": snap["size"],
        "color": snap["color"],
        "quantity": str(line.quantity),
        "unit_price": str(line.unit_price),
        "batch_lot": line.batch_lot,
        "barcode": line.barcode_snapshot or snap["barcode"],
        "system_qty": str(line.system_qty) if line.system_qty is not None else None,
        "counted_qty": str(line.counted_qty) if line.counted_qty is not None else None,
        "variance_qty": str(line.variance_qty),
        "line_value": str((line.quantity * line.unit_price).quantize(_MONEY)),
    }


def _serialize_movement(m: ConsignmentMovement, *, with_lines=True) -> dict:
    row = {
        "id": str(m.pk),
        "code": m.code,
        "movement_type": m.movement_type,
        "movement_date": m.movement_date.isoformat(),
        "customer": str(m.customer_id),
        "customer_code": m.customer.code,
        "customer_name": m.customer.name_ar,
        "counterparty_customer": str(m.counterparty_customer_id)
        if m.counterparty_customer_id
        else None,
        "counterparty_name": (
            m.counterparty_customer.name_ar if m.counterparty_customer_id else None
        ),
        "warehouse": str(m.warehouse_id),
        "warehouse_name": m.warehouse.name_ar,
        "branch": str(m.branch_id) if m.branch_id else None,
        "status": m.status,
        "notes": m.notes,
        "total_qty": str(m.total_qty),
        "total_value": str(m.total_value),
        "created_at": m.created_at.isoformat(),
        "approved_at": m.approved_at.isoformat() if m.approved_at else None,
    }
    if with_lines:
        row["lines"] = [_serialize_line(ln) for ln in m.lines.select_related(
            "variant__product", "variant__size", "variant__color"
        )]
    return row


def list_movements(*, movement_type=None, customer_id=None, status=None) -> list[dict]:
    qs = (
        ConsignmentMovement.objects.using(_USING)
        .filter(is_deleted=False)
        .select_related("customer", "counterparty_customer", "warehouse")
    )
    if movement_type:
        qs = qs.filter(movement_type=movement_type)
    if customer_id:
        qs = qs.filter(
            Q(customer_id=customer_id) | Q(counterparty_customer_id=customer_id)
        )
    if status:
        qs = qs.filter(status=status)
    return [_serialize_movement(m, with_lines=False) for m in qs[:200]]


def get_movement(pk) -> dict:
    m = (
        ConsignmentMovement.objects.using(_USING)
        .filter(is_deleted=False)
        .select_related("customer", "counterparty_customer", "warehouse", "branch")
        .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
        .get(pk=pk)
    )
    return _serialize_movement(m)


@transaction.atomic(using=_USING)
def create_movement(data: dict, user) -> dict:
    mtype = data["movement_type"]
    customer = Customer.objects.using(_USING).get(pk=data["customer"], is_active=True)
    if mtype == ConsignmentMovement.MovementType.TRANSFER and not data.get("counterparty_customer"):
        raise ValidationError("محل الوجهة مطلوب للتحويل")
    if not customer.uses_consignment and mtype == ConsignmentMovement.MovementType.SEND:
        customer.uses_consignment = True
        customer.save(using=_USING, update_fields=["uses_consignment"])

    lines_in = data.get("lines") or []
    if not lines_in:
        raise ValidationError("أضف صنفاً واحداً على الأقل")

    prefix = _PREFIX.get(mtype, "CSG")
    code = catalog_service._next_code(prefix, ConsignmentMovement)
    total_qty = Decimal("0")
    total_value = Decimal("0")

    movement = ConsignmentMovement.objects.using(_USING).create(
        code=code,
        movement_type=mtype,
        movement_date=data.get("movement_date") or timezone.localdate(),
        customer=customer,
        counterparty_customer_id=data.get("counterparty_customer") or None,
        warehouse_id=data["warehouse"],
        branch_id=data.get("branch") or None,
        status=ConsignmentMovement.Status.DRAFT,
        notes=data.get("notes", ""),
        created_by=user,
    )

    for row in lines_in:
        variant = ProductVariant.objects.using(_USING).select_related("product", "size", "color").get(
            pk=row["variant"]
        )
        qty = Decimal(str(row["quantity"]))
        price = Decimal(str(row.get("unit_price") or variant.sale_price or variant.product.sale_price or 0))
        total_qty += qty
        total_value += qty * price

        system_qty = row.get("system_qty")
        counted_qty = row.get("counted_qty")
        variance = Decimal("0")
        if mtype in (ConsignmentMovement.MovementType.COUNT, ConsignmentMovement.MovementType.SETTLEMENT):
            if counted_qty is not None and system_qty is not None:
                variance = Decimal(str(counted_qty)) - Decimal(str(system_qty))
            elif mtype == ConsignmentMovement.MovementType.COUNT:
                bal = ConsignmentBalance.objects.using(_USING).filter(
                    customer_id=customer.pk, variant_id=variant.pk, warehouse_id=data["warehouse"]
                ).first()
                system_qty = bal.qty_on_hand if bal else Decimal("0")
                counted_qty = qty
                variance = counted_qty - system_qty

        ConsignmentMovementLine.objects.using(_USING).create(
            movement=movement,
            variant=variant,
            quantity=qty,
            unit_price=price,
            batch_lot=row.get("batch_lot", ""),
            barcode_snapshot=row.get("barcode") or variant.barcode or "",
            system_qty=Decimal(str(system_qty)) if system_qty is not None else None,
            counted_qty=Decimal(str(counted_qty)) if counted_qty is not None else None,
            variance_qty=variance.quantize(_QUANT),
        )

    movement.total_qty = total_qty.quantize(_QUANT)
    movement.total_value = total_value.quantize(_MONEY)
    movement.save(using=_USING, update_fields=["total_qty", "total_value"])

    _audit("movement", movement.pk, "created", f"إنشاء {code}", user)
    _activity(customer.pk, movement.pk, "created", f"مسودة {code}", user)
    return get_movement(movement.pk)


@transaction.atomic(using=_USING)
def approve_movement(pk, user) -> dict:
    movement = (
        ConsignmentMovement.objects.using(_USING)
        .select_for_update()
        .prefetch_related("lines__variant")
        .get(pk=pk, is_deleted=False)
    )
    if movement.status not in (
        ConsignmentMovement.Status.DRAFT,
        ConsignmentMovement.Status.PENDING,
    ):
        raise ValidationError("الحركة معتمدة أو ملغاة")

    mtype = movement.movement_type
    for line in movement.lines.all():
        qty = line.quantity
        variant_id = line.variant_id
        wh = movement.warehouse_id

        if mtype == ConsignmentMovement.MovementType.SEND:
            bal = _get_or_create_balance(movement.customer_id, variant_id, wh)
            _apply_balance_delta(bal, sent=qty, on_hand=qty)
            _adjust_balance(wh, variant_id, -qty)

        elif mtype == ConsignmentMovement.MovementType.RETURN:
            bal = _get_or_create_balance(movement.customer_id, variant_id, wh)
            if bal.qty_on_hand < qty:
                raise ValidationError("الكمية المرتجعة أكبر من الرصيد")
            _apply_balance_delta(bal, returned=qty, on_hand=-qty)
            _adjust_balance(wh, variant_id, qty)

        elif mtype == ConsignmentMovement.MovementType.TRANSFER:
            if not movement.counterparty_customer_id:
                raise ValidationError("محل الوجهة مطلوب")
            src = _get_or_create_balance(movement.customer_id, variant_id, wh)
            if src.qty_on_hand < qty:
                raise ValidationError("رصيد غير كافٍ للتحويل")
            dst = _get_or_create_balance(movement.counterparty_customer_id, variant_id, wh)
            _apply_balance_delta(src, on_hand=-qty)
            _apply_balance_delta(dst, on_hand=qty)

        elif mtype == ConsignmentMovement.MovementType.COUNT:
            bal = _get_or_create_balance(movement.customer_id, variant_id, wh)
            counted = line.counted_qty if line.counted_qty is not None else qty
            system = line.system_qty if line.system_qty is not None else bal.qty_on_hand
            diff = counted - system
            bal.qty_on_hand = counted.quantize(_QUANT)
            bal.recalc_sold()
            bal.last_movement_at = timezone.now()
            bal.save(using=_USING)
            line.variance_qty = diff.quantize(_QUANT)
            line.save(using=_USING, update_fields=["variance_qty"])

        elif mtype == ConsignmentMovement.MovementType.SETTLEMENT:
            bal = _get_or_create_balance(movement.customer_id, variant_id, wh)
            var = line.variance_qty
            if var > 0:
                bal.qty_on_hand = (bal.qty_on_hand + var).quantize(_QUANT)
            elif var < 0:
                sold_part = -var
                bal.qty_on_hand = (bal.qty_on_hand + var).quantize(_QUANT)
                if bal.qty_on_hand < 0:
                    bal.qty_on_hand = Decimal("0")
            bal.recalc_sold()
            bal.save(using=_USING)

    movement.status = ConsignmentMovement.Status.APPROVED
    movement.approved_by = user
    movement.approved_at = timezone.now()
    movement.save(using=_USING, update_fields=["status", "approved_by", "approved_at"])

    _sync_customer_sales_totals(movement.customer_id)
    if movement.counterparty_customer_id:
        _sync_customer_sales_totals(movement.counterparty_customer_id)

    _audit("movement", movement.pk, "approved", f"اعتماد {movement.code}", user)
    _activity(movement.customer_id, movement.pk, "approved", f"اعتماد {movement.code}", user)
    return get_movement(movement.pk)


def _sync_customer_sales_totals(customer_id):
    """مزامنة إجمالي المبيعات الفعلية من الأمانات على سجل العميل."""
    agg = ConsignmentBalance.objects.using(_USING).filter(customer_id=customer_id).aggregate(
        sold=Sum("qty_sold"),
        on_hand=Sum("qty_on_hand"),
        sent=Sum("qty_sent_total"),
    )
    sold_val = agg["sold"] or Decimal("0")
    Customer.objects.using(_USING).filter(pk=customer_id).update(
        purchase_count=int(sold_val),
        last_activity_at=timezone.now(),
    )


@transaction.atomic(using=_USING)
def cancel_movement(pk, user) -> dict:
    movement = ConsignmentMovement.objects.using(_USING).select_for_update().get(pk=pk)
    if movement.status == ConsignmentMovement.Status.APPROVED:
        raise ValidationError("لا يمكن إلغاء حركة معتمدة")
    movement.status = ConsignmentMovement.Status.CANCELLED
    movement.save(using=_USING, update_fields=["status"])
    _audit("movement", movement.pk, "cancelled", f"إلغاء {movement.code}", user)
    return get_movement(movement.pk)


def soft_delete_movement(pk, user) -> None:
    movement = ConsignmentMovement.objects.using(_USING).get(pk=pk)
    if movement.status == ConsignmentMovement.Status.APPROVED:
        raise ValidationError("لا يمكن حذف حركة معتمدة")
    movement.is_deleted = True
    movement.deleted_at = timezone.now()
    movement.save(using=_USING, update_fields=["is_deleted", "deleted_at"])
    _audit("movement", movement.pk, "soft_delete", f"حذف {movement.code}", user)


def customer_balance_report(customer_id) -> dict:
    rows = (
        ConsignmentBalance.objects.using(_USING)
        .filter(customer_id=customer_id, qty_on_hand__gt=0)
        .select_related("variant__product", "variant__size", "variant__color", "warehouse")
        .order_by("-qty_on_hand")[:500]
    )
    lines = []
    total_on_hand = Decimal("0")
    total_sold = Decimal("0")
    total_sent = Decimal("0")
    for b in rows:
        v = b.variant
        val = (b.qty_on_hand * (v.sale_price or v.product.sale_price or 0)).quantize(_MONEY)
        total_on_hand += b.qty_on_hand
        total_sold += b.qty_sold
        total_sent += b.qty_sent_total
        lines.append(
            {
                **_variant_snapshot(v),
                "warehouse": b.warehouse.name_ar,
                "qty_sent": str(b.qty_sent_total),
                "qty_on_hand": str(b.qty_on_hand),
                "qty_returned": str(b.qty_returned_total),
                "qty_sold": str(b.qty_sold),
                "value_on_hand": str(val),
            }
        )
    return {
        "customer_id": str(customer_id),
        "formula": "qty_sold = qty_sent - qty_on_hand - qty_returned",
        "totals": {
            "qty_sent": str(total_sent.quantize(_QUANT)),
            "qty_on_hand": str(total_on_hand.quantize(_QUANT)),
            "qty_sold": str(total_sold.quantize(_QUANT)),
        },
        "lines": lines,
    }


def customer_count_sheet(customer_id, *, warehouse_id=None) -> dict:
    """ورقة جرد فعلي — كل الأصناف المرسلة للمحل."""
    qs = (
        ConsignmentBalance.objects.using(_USING)
        .filter(customer_id=customer_id)
        .filter(Q(qty_sent_total__gt=0) | Q(qty_on_hand__gt=0))
        .select_related(
            "variant__product",
            "variant__product__brand",
            "variant__product__section",
            "variant__product__supplier",
            "variant__size",
            "variant__color",
            "warehouse",
            "customer",
        )
    )
    if warehouse_id:
        qs = qs.filter(warehouse_id=warehouse_id)

    lines = []
    total_on_hand = Decimal("0")
    total_sold = Decimal("0")
    total_sent = Decimal("0")
    total_sold_value = Decimal("0")
    total_on_hand_value = Decimal("0")

    for b in qs.order_by("-qty_on_hand")[:800]:
        v = b.variant
        unit_price = Decimal(str(v.sale_price or v.product.sale_price or 0))
        on_hand_val = (b.qty_on_hand * unit_price).quantize(_MONEY)
        sold_val = (b.qty_sold * unit_price).quantize(_MONEY)
        total_on_hand += b.qty_on_hand
        total_sold += b.qty_sold
        total_sent += b.qty_sent_total
        total_sold_value += sold_val
        total_on_hand_value += on_hand_val
        lines.append(
            {
                **_variant_snapshot(v),
                "balance_id": str(b.pk),
                "warehouse_id": str(b.warehouse_id),
                "warehouse": b.warehouse.name_ar,
                "brand_name": v.product.brand.name_ar if v.product.brand_id else "",
                "section_name": v.product.section.name_ar if v.product.section_id else "",
                "supplier_name": v.product.supplier.name_ar if v.product.supplier_id else "",
                "qty_sent": str(b.qty_sent_total),
                "qty_on_hand": str(b.qty_on_hand),
                "qty_returned": str(b.qty_returned_total),
                "qty_sold": str(b.qty_sold),
                "unit_price": str(unit_price.quantize(_MONEY)),
                "value_on_hand": str(on_hand_val),
                "value_sold": str(sold_val),
                "counted_qty": str(b.qty_on_hand),
            }
        )

    customer = Customer.objects.using(_USING).get(pk=customer_id)
    return {
        "customer_id": str(customer_id),
        "customer_code": customer.code,
        "customer_name": customer.name_ar,
        "formula": "المبيعات الفعلية = المرسل − الرصيد الحالي − المرتجعات",
        "totals": {
            "qty_sent": str(total_sent.quantize(_QUANT)),
            "qty_on_hand": str(total_on_hand.quantize(_QUANT)),
            "qty_sold": str(total_sold.quantize(_QUANT)),
            "value_on_hand": str(total_on_hand_value.quantize(_MONEY)),
            "value_sold": str(total_sold_value.quantize(_MONEY)),
            "balance_due": str(customer.balance_due),
        },
        "lines": lines,
    }


def customer_count_result(customer_id, *, counted_lines: list[dict]) -> dict:
    """تقرير بعد الجرد — مقارنة الدفتري بالفعلي."""
    sheet = customer_count_sheet(customer_id)
    line_map = {str(r["variant_id"]): r for r in counted_lines}
    rows = []
    total_sold_qty = Decimal("0")
    total_sold_value = Decimal("0")
    total_on_hand = Decimal("0")

    for ln in sheet["lines"]:
        vid = str(ln["variant_id"])
        override = line_map.get(vid, {})
        counted = Decimal(str(override.get("counted_qty", ln["qty_on_hand"])))
        system = Decimal(str(ln["qty_on_hand"]))
        sent = Decimal(str(ln["qty_sent"]))
        returned = Decimal(str(ln["qty_returned"]))
        sold = (sent - counted - returned).quantize(_QUANT)
        if sold < 0:
            sold = Decimal("0")
        unit_price = Decimal(str(ln["unit_price"]))
        sold_value = (sold * unit_price).quantize(_MONEY)
        total_sold_qty += sold
        total_sold_value += sold_value
        total_on_hand += counted
        rows.append(
            {
                **ln,
                "system_qty": str(system),
                "counted_qty": str(counted.quantize(_QUANT)),
                "variance_qty": str((counted - system).quantize(_QUANT)),
                "qty_sold_after_count": str(sold),
                "value_sold_after_count": str(sold_value),
            }
        )

    customer = Customer.objects.using(_USING).get(pk=customer_id)
    return {
        "customer_id": str(customer_id),
        "customer_code": customer.code,
        "customer_name": customer.name_ar,
        "formula": sheet["formula"],
        "totals": {
            "qty_sent": sheet["totals"]["qty_sent"],
            "qty_on_hand": str(total_on_hand.quantize(_QUANT)),
            "qty_sold": str(total_sold_qty.quantize(_QUANT)),
            "value_sold": str(total_sold_value.quantize(_MONEY)),
            "balance_due": str(customer.balance_due),
        },
        "lines": rows,
    }


def consignment_dashboard() -> dict:
    balances = ConsignmentBalance.objects.using(_USING).select_related(
        "customer", "variant__product", "variant__size", "variant__color"
    )
    total_on_hand_value = Decimal("0")
    total_sold_qty = Decimal("0")
    total_sent_qty = Decimal("0")
    by_customer: dict[str, dict] = {}
    by_size: dict[str, Decimal] = {}
    by_color: dict[str, Decimal] = {}
    stagnant_cutoff = timezone.now() - timedelta(days=60)

    for b in balances:
        price = b.variant.sale_price or b.variant.product.sale_price or Decimal("0")
        val = b.qty_on_hand * price
        total_on_hand_value += val
        total_sold_qty += b.qty_sold
        total_sent_qty += b.qty_sent_total
        cid = str(b.customer_id)
        if cid not in by_customer:
            by_customer[cid] = {
                "customer_id": cid,
                "customer_code": b.customer.code,
                "customer_name": b.customer.name_ar,
                "qty_sold": Decimal("0"),
                "qty_on_hand_value": Decimal("0"),
                "balance_due": str(b.customer.balance_due),
            }
        by_customer[cid]["qty_sold"] += b.qty_sold
        by_customer[cid]["qty_on_hand_value"] += val
        sz = b.variant.size.code
        cl = b.variant.color.code
        by_size[sz] = by_size.get(sz, Decimal("0")) + b.qty_on_hand
        by_color[cl] = by_color.get(cl, Decimal("0")) + b.qty_on_hand

    top_sales_raw = sorted(by_customer.values(), key=lambda x: -x["qty_sold"])[:15]
    top_debt = sorted(
        by_customer.values(), key=lambda x: -Decimal(x["balance_due"])
    )[:15]

    stagnant = (
        ConsignmentBalance.objects.using(_USING)
        .filter(qty_on_hand__gt=0)
        .filter(Q(last_movement_at__lt=stagnant_cutoff) | Q(last_movement_at__isnull=True))
        .select_related("variant__product", "customer")[:20]
    )
    stagnant_rows = [
        {
            "customer_name": s.customer.name_ar,
            "product": s.variant.product.name_ar,
            "qty_on_hand": str(s.qty_on_hand),
            "days_idle": (
                (timezone.now() - s.last_movement_at).days if s.last_movement_at else 999
            ),
        }
        for s in stagnant
    ]

    turnover = Decimal("0")
    if total_sent_qty > 0:
        turnover = (total_sold_qty / total_sent_qty * 100).quantize(_MONEY)

    surplus_deficit = (
        ConsignmentMovementLine.objects.using(_USING)
        .filter(
            movement__movement_type__in=(
                ConsignmentMovement.MovementType.COUNT,
                ConsignmentMovement.MovementType.SETTLEMENT,
            ),
            movement__status=ConsignmentMovement.Status.APPROVED,
        )
        .aggregate(s=Sum("variance_qty"))
    )
    var_total = (surplus_deficit["s"] or Decimal("0")).quantize(_QUANT)

    alerts = _consignment_alerts(by_customer, stagnant_rows)

    top_sales = [
        {
            **row,
            "qty_sold": str(row["qty_sold"].quantize(_QUANT)),
            "qty_on_hand_value": str(row["qty_on_hand_value"].quantize(_MONEY)),
        }
        for row in top_sales_raw
    ]

    return {
        "kpis": {
            "total_consignment_value": str(total_on_hand_value.quantize(_MONEY)),
            "total_sold_qty": str(total_sold_qty.quantize(_QUANT)),
            "total_sent_qty": str(total_sent_qty.quantize(_QUANT)),
            "turnover_percent": str(turnover),
            "surplus_deficit_qty": str(var_total),
            "active_shops": len(by_customer),
        },
        "top_sales_shops": top_sales,
        "top_debt_customers": top_debt,
        "stagnant_items": stagnant_rows,
        "size_breakdown": [
            {"size": k, "qty": str(v.quantize(_QUANT))}
            for k, v in sorted(by_size.items(), key=lambda x: -x[1])[:12]
        ],
        "color_breakdown": [
            {"color": k, "qty": str(v.quantize(_QUANT))}
            for k, v in sorted(by_color.items(), key=lambda x: -x[1])[:12]
        ],
        "alerts": alerts,
    }


def _consignment_alerts(by_customer, stagnant) -> list[dict]:
    alerts = []
    for row in stagnant[:5]:
        alerts.append(
            {
                "level": "warning",
                "message_ar": f"صنف راكد لدى {row['customer_name']}: {row['product']}",
                "message_en": "Stagnant consignment item",
            }
        )
    high_sold = [
        c
        for c in by_customer.values()
        if Decimal(str(c.get("qty_sold") or 0)) > Decimal("500")
    ]
    if high_sold:
        alerts.append(
            {
                "level": "info",
                "message_ar": f"{len(high_sold)} محلات بمبيعات أمانة مرتفعة",
                "message_en": "High consignment sales",
            }
        )
    return alerts


def realtime_sales_for_customer(customer_id) -> dict:
    """المبيعات الفعلية لحظياً حسب المعادلة."""
    bals = ConsignmentBalance.objects.using(_USING).filter(customer_id=customer_id)
    lines = []
    total_sold = Decimal("0")
    for b in bals:
        b.recalc_sold()
        b.save(using=_USING, update_fields=["qty_sold", "updated_at"])
        total_sold += b.qty_sold
        lines.append(
            {
                "variant_id": str(b.variant_id),
                "qty_sent": str(b.qty_sent_total),
                "qty_on_hand": str(b.qty_on_hand),
                "qty_returned": str(b.qty_returned_total),
                "qty_sold": str(b.qty_sold),
            }
        )
    return {
        "customer_id": str(customer_id),
        "actual_sales_qty": str(total_sold.quantize(_QUANT)),
        "lines": lines,
        "updated_at": timezone.now().isoformat(),
    }


def seed_consignment_demo():
    if ConsignmentBalance.objects.using(_USING).exists():
        return {"seeded": 0}
    shops = list(Customer.objects.using(_USING).filter(is_active=True)[:4])
    from erp.models import Warehouse

    wh = Warehouse.objects.using(_USING).filter(is_active=True).first()
    variants = list(ProductVariant.objects.using(_USING).filter(is_active=True)[:6])
    if not wh or not shops or not variants:
        return {"seeded": 0}
    count = 0
    for i, shop in enumerate(shops):
        shop.uses_consignment = True
        shop.save(using=_USING, update_fields=["uses_consignment"])
        sent = Decimal(str(20 + i * 5))
        on_hand = Decimal(str(8 + i))
        returned = Decimal(str(2))
        for v in variants[:3]:
            bal = _get_or_create_balance(shop.pk, v.pk, wh.pk)
            bal.qty_sent_total = sent
            bal.qty_on_hand = on_hand
            bal.qty_returned_total = returned
            bal.recalc_sold()
            bal.last_movement_at = timezone.now()
            bal.save(using=_USING)
        code = catalog_service._next_code("CSN", ConsignmentMovement)
        line_value = Decimal("0")
        movement = ConsignmentMovement.objects.using(_USING).create(
            code=code,
            movement_type=ConsignmentMovement.MovementType.SEND,
            movement_date=timezone.localdate(),
            customer=shop,
            warehouse=wh,
            status=ConsignmentMovement.Status.APPROVED,
            total_qty=sent * 3,
            total_value=Decimal("0"),
            approved_at=timezone.now(),
        )
        for v in variants[:3]:
            price = v.sale_price or v.product.sale_price or Decimal("100")
            line_value += sent * price
            ConsignmentMovementLine.objects.using(_USING).create(
                movement=movement,
                variant=v,
                quantity=sent,
                unit_price=price,
                barcode_snapshot=v.barcode or "",
            )
        movement.total_value = line_value.quantize(_MONEY)
        movement.save(using=_USING, update_fields=["total_value"])
        count += 1
    return {"seeded": count}


def consignment_reports_summary() -> dict:
    """ملخص تقارير الأمانات — كشف / حركة / مبيعات فعلية."""
    cust_ids = (
        ConsignmentBalance.objects.using(_USING)
        .values_list("customer_id", flat=True)
        .distinct()
    )
    customers = Customer.objects.using(_USING).filter(pk__in=cust_ids)[:100]
    rows = []
    for c in customers:
        rep = customer_balance_report(c.pk)
        rt = realtime_sales_for_customer(c.pk)
        rows.append(
            {
                "customer_code": c.code,
                "customer_name": c.name_ar,
                "qty_sent": rep["totals"]["qty_sent"],
                "qty_on_hand": rep["totals"]["qty_on_hand"],
                "qty_sold": rep["totals"]["qty_sold"],
                "actual_sales_qty": rt["actual_sales_qty"],
                "balance_due": str(c.balance_due),
            }
        )
    return {
        "customers": rows,
        "formula": "qty_sold = qty_sent - qty_on_hand - qty_returned",
    }
