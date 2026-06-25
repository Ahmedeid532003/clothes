"""أوامر الشراء من تنبيهات حد الطلب — إنشاء، إرسال، استلام."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from urllib.parse import quote

from django.db import transaction
from django.db.models import F, Prefetch
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.product_models import Product
from erp.purchase_order_models import PurchaseOrder, PurchaseOrderLine
from erp.services import catalog as catalog_service
from erp.services.reorder_alerts import build_reorder_alerts

_USING = "tenant"


def _load_order(pk) -> PurchaseOrder:
    return (
        PurchaseOrder.objects.using(_USING)
        .select_related("supplier", "season", "sent_by")
        .prefetch_related(
            Prefetch(
                "lines",
                queryset=PurchaseOrderLine.objects.using(_USING).select_related(
                    "product__brand"
                ),
            )
        )
        .get(pk=pk)
    )


def serialize_order_line(line: PurchaseOrderLine) -> dict:
    product = line.product
    qty_ord = line.quantity_ordered or Decimal("0")
    qty_rec = line.quantity_received or Decimal("0")
    pending = max(qty_ord - qty_rec, Decimal("0"))
    fully_received = qty_ord > 0 and qty_rec >= qty_ord
    return {
        "id": str(line.id),
        "product_id": str(product.id),
        "product_code": product.code,
        "product_name": product.name_ar,
        "product_description": product.description or "",
        "brand_name": product.brand.name_ar if product.brand_id else "—",
        "quantity_ordered": str(qty_ord.quantize(Decimal("0.001"))),
        "quantity_received": str(qty_rec.quantize(Decimal("0.001"))),
        "quantity_pending": str(pending.quantize(Decimal("0.001"))),
        "unit_price": str(line.unit_price or Decimal("0")),
        "notes": line.notes or "",
        "is_fully_received": fully_received,
    }


def serialize_order(order: PurchaseOrder) -> dict:
    lines = [serialize_order_line(ln) for ln in order.lines.all()]
    total_ordered = sum(
        (ln.quantity_ordered or Decimal("0")) for ln in order.lines.all()
    )
    total_received = sum(
        (ln.quantity_received or Decimal("0")) for ln in order.lines.all()
    )
    payload = {
        "id": str(order.id),
        "code": order.code,
        "supplier_id": str(order.supplier_id),
        "supplier_name": order.supplier.name_ar,
        "supplier_whatsapp": order.supplier.whatsapp or "",
        "season_id": str(order.season_id),
        "season_name": order.season.name_ar,
        "status": order.status,
        "status_label": order.get_status_display(),
        "notes": order.notes or "",
        "whatsapp_sent_at": (
            order.whatsapp_sent_at.isoformat() if order.whatsapp_sent_at else None
        ),
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "lines": lines,
        "totals": {
            "quantity_ordered": str(total_ordered.quantize(Decimal("0.001"))),
            "quantity_received": str(total_received.quantize(Decimal("0.001"))),
            "line_count": len(lines),
        },
    }
    payload["whatsapp_url"] = whatsapp_url_for_order(payload)
    return payload


def build_whatsapp_message(order_payload: dict) -> str:
    supplier = order_payload.get("supplier_name") or ""
    code = order_payload.get("code") or ""
    season = order_payload.get("season_name") or ""
    lines = order_payload.get("lines") or []
    items_text = []
    for ln in lines:
        qty = ln.get("quantity_ordered") or "—"
        if qty in ("0", "0.000", ""):
            qty = "—"
        items_text.append(
            f"• {ln.get('product_code')} — {ln.get('product_name')} ({qty})"
        )
    body = "\n".join(items_text) if items_text else "—"
    return (
        f"السلام عليكم، أمر شراء من فرعنا.\n"
        f"رقم الأمر: {code}\n"
        f"المورد: {supplier}\n"
        f"الموسم: {season}\n"
        f"الأصناف:\n{body}\n"
        f"يرجى التأكيد وإرسال الشحنة. شكراً."
    )


def whatsapp_url_for_order(order_payload: dict) -> str | None:
    phone = "".join(
        x for x in (order_payload.get("supplier_whatsapp") or "") if x.isdigit()
    )
    if not phone:
        return None
    text = quote(build_whatsapp_message(order_payload))
    return f"https://wa.me/{phone}?text={text}"


def _recalc_order_status(order: PurchaseOrder) -> None:
    lines = list(order.lines.all())
    if not lines:
        order.status = PurchaseOrder.Status.SENT
        return
    all_received = all(
        (ln.quantity_received or Decimal("0")) >= (ln.quantity_ordered or Decimal("0"))
        and (ln.quantity_ordered or Decimal("0")) > 0
        for ln in lines
    )
    any_received = any(
        (ln.quantity_received or Decimal("0")) > 0 for ln in lines
    )
    if all_received:
        order.status = PurchaseOrder.Status.RECEIVED
    elif any_received:
        order.status = PurchaseOrder.Status.PARTIAL
    elif order.status == PurchaseOrder.Status.DRAFT:
        order.status = PurchaseOrder.Status.SENT


@transaction.atomic(using=_USING)
def create_orders_from_reorder(*, lines_data: list[dict], user) -> list[dict]:
    """إنشاء أمر شراء لكل مورد من الأصناف المحددة وإرسالها."""
    if not lines_data:
        raise ValidationError("حدد صنفاً واحداً على الأقل.")

    alerts = build_reorder_alerts()
    alert_by_product = {item["product_id"]: item for item in alerts.get("items", [])}
    season_id = alerts["season_id"]

    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in lines_data:
        pid = str(row.get("product_id") or "").strip()
        if not pid:
            continue
        if pid not in alert_by_product:
            raise ValidationError(f"الصنف {pid} غير موجود في تنبيهات حد الطلب الحالية.")
        grouped[alert_by_product[pid]["supplier_id"]].append(row)

    if not grouped:
        raise ValidationError("لا توجد أصناف صالحة للطلب.")

    created_orders = []
    now = timezone.now()

    for supplier_id, rows in grouped.items():
        if not supplier_id:
            raise ValidationError("يوجد صنف بدون مورد — عيّن المورد أولاً.")

        code = catalog_service._next_code("PO", PurchaseOrder)
        order = PurchaseOrder.objects.using(_USING).create(
            code=code,
            supplier_id=supplier_id,
            season_id=season_id,
            status=PurchaseOrder.Status.SENT,
            sent_by=user,
            whatsapp_sent_at=now,
        )

        for row in rows:
            pid = str(row["product_id"])
            alert = alert_by_product[pid]
            qty_raw = row.get("quantity_ordered")
            qty = Decimal("0")
            if qty_raw not in (None, ""):
                qty = Decimal(str(qty_raw))
            try:
                product = Product.objects.using(_USING).get(pk=pid)
            except Product.DoesNotExist:
                raise ValidationError(f"الصنف {pid} غير موجود.")
            PurchaseOrderLine.objects.using(_USING).create(
                order=order,
                product=product,
                quantity_ordered=qty,
                unit_price=product.purchase_price or Decimal("0"),
                notes=alert.get("product_name") or "",
            )

        order = _load_order(order.id)
        created_orders.append(serialize_order(order))

    return created_orders


@transaction.atomic(using=_USING)
def receive_order_lines(*, order_id: str, lines_data: list[dict]) -> dict:
    try:
        order = (
            PurchaseOrder.objects.using(_USING)
            .select_for_update()
            .prefetch_related("lines")
            .get(pk=order_id)
        )
    except PurchaseOrder.DoesNotExist:
        raise ValidationError("أمر الشراء غير موجود.")

    if order.status == PurchaseOrder.Status.CANCELLED:
        raise ValidationError("أمر الشراء ملغى.")

    line_map = {str(ln.id): ln for ln in order.lines.all()}
    for row in lines_data:
        line_id = str(row.get("line_id") or "")
        if line_id not in line_map:
            raise ValidationError(f"بند غير موجود: {line_id}")
        ln = line_map[line_id]
        add_qty = Decimal(str(row.get("quantity_received") or "0"))
        if add_qty < 0:
            raise ValidationError("كمية الاستلام لا يمكن أن تكون سالبة.")
        ln.quantity_received = (ln.quantity_received or Decimal("0")) + add_qty
        ln.save(using=_USING, update_fields=["quantity_received"])

    _recalc_order_status(order)
    order.save(using=_USING, update_fields=["status", "updated_at"])
    return serialize_order(_load_order(order.id))


def list_orders(*, status: str | None = None, supplier_id: str | None = None) -> list[dict]:
    try:
        qs = (
            PurchaseOrder.objects.using(_USING)
            .select_related("supplier", "season", "sent_by")
            .prefetch_related(
                Prefetch(
                    "lines",
                    queryset=PurchaseOrderLine.objects.using(_USING).select_related(
                        "product__brand"
                    ),
                )
            )
            .order_by("-created_at")
        )
        if status:
            qs = qs.filter(status=status)
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return [serialize_order(o) for o in qs[:500]]
    except Exception:
        return []
