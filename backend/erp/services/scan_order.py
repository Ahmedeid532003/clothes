"""خدمات الأوردرات — مسح باركود وتحميل المستندات."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.branch_context import get_branch_sale_warehouse
from erp.models import Branch, User
from erp.product_models import ProductVariant
from erp.scan_order_models import ScanOrder, ScanOrderLine
from erp.services import catalog as catalog_service
from erp.services.inventory_extended import _variant_unit_price
from erp.supplier_models import Supplier

_USING = "tenant"
_MONEY = Decimal("0.01")
_QTY = Decimal("0.001")


def _z_money(v: Decimal) -> str:
    return str(v.quantize(_MONEY))


def _z_qty(v: Decimal) -> str:
    return str(v.quantize(_QTY))


def resolve_employee(*, employee_code: str) -> User:
    code = (employee_code or "").strip()
    if not code:
        raise ValidationError("رقم الموظف مطلوب.")
    try:
        return User.objects.using(_USING).get(employee_code__iexact=code, is_active=True)
    except User.DoesNotExist:
        raise ValidationError(f"موظف غير موجود برقم: {code}")


def _resolve_barcode(*, barcode: str, supplier_id=None) -> ProductVariant:
    bc = (barcode or "").strip()
    if not bc:
        raise ValidationError("الباركود مطلوب.")
    variant = (
        ProductVariant.objects.using(_USING)
        .filter(
            Q(barcode__iexact=bc) | Q(product__barcode__iexact=bc),
            is_active=True,
            product__is_active=True,
        )
        .select_related("product", "product__supplier", "size", "color")
        .first()
    )
    if not variant:
        raise ValidationError(f"باركود غير معروف: {bc}")
    if supplier_id and str(variant.product.supplier_id) != str(supplier_id):
        raise ValidationError(
            f"الصنف {variant.product.code} لا يتبع المورد المحدد — تم رفض المسح."
        )
    return variant


def _sale_price(variant: ProductVariant) -> Decimal:
    return _variant_unit_price(variant, "sale_price")


def _recalc_totals(order: ScanOrder) -> None:
    lines = list(order.lines.all())
    order.line_count = len(lines)
    order.total_quantity = sum((ln.quantity for ln in lines), Decimal("0")).quantize(_QTY)
    order.total_sale_amount = sum((ln.line_total for ln in lines), Decimal("0")).quantize(_MONEY)
    order.save(
        using=_USING,
        update_fields=["line_count", "total_quantity", "total_sale_amount", "updated_at"],
    )


def _serialize_line(line: ScanOrderLine) -> dict:
    v = line.variant
    p = v.product
    return {
        "id": str(line.id),
        "variant_id": str(v.id),
        "product_id": str(p.id),
        "product_code": p.code,
        "product_name": p.name_ar,
        "size_name": v.size.name_ar if v.size_id else "",
        "color_name": v.color.name_ar if v.color_id else "",
        "barcode": line.barcode_scanned or v.barcode or p.barcode,
        "quantity": _z_qty(line.quantity),
        "unit_sale_price": _z_money(line.unit_sale_price),
        "line_total": _z_money(line.line_total),
        "supplier_id": str(p.supplier_id) if p.supplier_id else "",
        "supplier_name": p.supplier.name_ar if p.supplier_id else "",
    }


def _serialize_order(order: ScanOrder, *, include_lines: bool = False) -> dict:
    payload = {
        "id": str(order.id),
        "code": order.code,
        "order_type": order.order_type,
        "order_type_label": order.get_order_type_display(),
        "status": order.status,
        "status_label": order.get_status_display(),
        "employee_id": str(order.employee_id),
        "employee_code": order.employee.employee_code or "",
        "employee_name": order.employee.full_name or order.employee.username,
        "branch_id": str(order.branch_id),
        "branch_name": order.branch.name_ar,
        "warehouse_id": str(order.warehouse_id) if order.warehouse_id else "",
        "warehouse_name": order.warehouse.name_ar if order.warehouse_id else "",
        "supplier_id": str(order.supplier_id) if order.supplier_id else "",
        "supplier_name": order.supplier.name_ar if order.supplier_id else "",
        "line_count": order.line_count,
        "total_quantity": _z_qty(order.total_quantity),
        "total_sale_amount": _z_money(order.total_sale_amount),
        "notes": order.notes or "",
        "printed_at": order.printed_at.isoformat() if order.printed_at else "",
        "loaded_into": order.loaded_into or "",
        "created_at": order.created_at.isoformat(),
    }
    if include_lines:
        payload["lines"] = [_serialize_line(ln) for ln in order.lines.select_related(
            "variant__product__supplier", "variant__size", "variant__color"
        )]
    return payload


def list_scan_orders(*, order_type=None, status=None, limit: int = 300) -> list[dict]:
    qs = (
        ScanOrder.objects.using(_USING)
        .select_related("employee", "branch", "warehouse", "supplier")
        .order_by("-created_at")[:limit]
    )
    if order_type:
        qs = qs.filter(order_type=order_type)
    if status:
        qs = qs.filter(status=status)
    return [_serialize_order(o) for o in qs]


def get_scan_order(pk=None, *, by_code: str | None = None) -> dict:
    if by_code:
        order = (
            ScanOrder.objects.using(_USING)
            .select_related("employee", "branch", "warehouse", "supplier")
            .prefetch_related("lines__variant__product__supplier", "lines__variant__size", "lines__variant__color")
            .get(code__iexact=by_code.strip())
        )
    elif pk:
        order = (
            ScanOrder.objects.using(_USING)
            .select_related("employee", "branch", "warehouse", "supplier")
            .prefetch_related("lines__variant__product__supplier", "lines__variant__size", "lines__variant__color")
            .get(pk=pk)
        )
    else:
        raise ValidationError("معرّف الأوردر مطلوب.")
    return _serialize_order(order, include_lines=True)


@transaction.atomic(using=_USING)
def create_scan_order(*, branch: Branch, data: dict, user) -> dict:
    order_type = data.get("order_type") or ScanOrder.OrderType.SALE
    if order_type not in ScanOrder.OrderType.values:
        raise ValidationError("نوع الأوردر غير صالح.")

    employee = resolve_employee(employee_code=data.get("employee_code", ""))
    supplier_id = data.get("supplier")
    if order_type == ScanOrder.OrderType.PURCHASE_RETURN:
        if not supplier_id:
            raise ValidationError("المورد مطلوب لأوردر مرتجع مورد.")
        if not Supplier.objects.using(_USING).filter(pk=supplier_id, is_active=True).exists():
            raise ValidationError("المورد غير موجود.")

    warehouse = None
    wh_id = data.get("warehouse")
    if wh_id:
        from erp.models import Warehouse

        warehouse = Warehouse.objects.using(_USING).get(pk=wh_id, is_active=True)
    else:
        warehouse = get_branch_sale_warehouse(branch)

    order = ScanOrder.objects.using(_USING).create(
        code=catalog_service._next_code("ORD", ScanOrder),
        order_type=order_type,
        employee=employee,
        branch=branch,
        warehouse=warehouse,
        supplier_id=supplier_id if supplier_id else None,
        notes=(data.get("notes") or "").strip(),
        created_by=user,
        status=ScanOrder.Status.DRAFT,
    )
    return _serialize_order(order, include_lines=True)


@transaction.atomic(using=_USING)
def scan_barcode(*, order_id, barcode: str, quantity=None) -> dict:
    order = ScanOrder.objects.using(_USING).select_for_update().get(pk=order_id)
    if order.status not in (ScanOrder.Status.DRAFT, ScanOrder.Status.SAVED):
        raise ValidationError("لا يمكن المسح على أوردر مغلق.")

    qty = Decimal(str(quantity or 1)).quantize(_QTY)
    if qty <= 0:
        raise ValidationError("الكمية يجب أن تكون أكبر من صفر.")

    variant = _resolve_barcode(barcode=barcode, supplier_id=order.supplier_id)
    unit = _sale_price(variant)
    existing = (
        ScanOrderLine.objects.using(_USING)
        .filter(scan_order=order, variant=variant)
        .first()
    )
    if existing:
        existing.quantity = (existing.quantity + qty).quantize(_QTY)
        existing.line_total = (existing.quantity * existing.unit_sale_price).quantize(_MONEY)
        existing.barcode_scanned = (barcode or "").strip()
        existing.save(using=_USING, update_fields=["quantity", "line_total", "barcode_scanned"])
    else:
        ScanOrderLine.objects.using(_USING).create(
            scan_order=order,
            variant=variant,
            barcode_scanned=(barcode or "").strip(),
            quantity=qty,
            unit_sale_price=unit,
            line_total=(qty * unit).quantize(_MONEY),
        )
    _recalc_totals(order)
    return get_scan_order(order.pk)


@transaction.atomic(using=_USING)
def update_scan_order_line(*, order_id, line_id, quantity) -> dict:
    order = ScanOrder.objects.using(_USING).get(pk=order_id)
    if order.status not in (ScanOrder.Status.DRAFT, ScanOrder.Status.SAVED):
        raise ValidationError("لا يمكن تعديل أوردر مغلق.")
    qty = Decimal(str(quantity)).quantize(_QTY)
    if qty <= 0:
        ScanOrderLine.objects.using(_USING).filter(pk=line_id, scan_order=order).delete()
    else:
        line = ScanOrderLine.objects.using(_USING).get(pk=line_id, scan_order=order)
        line.quantity = qty
        line.line_total = (qty * line.unit_sale_price).quantize(_MONEY)
        line.save(using=_USING, update_fields=["quantity", "line_total"])
    _recalc_totals(order)
    return get_scan_order(order.pk)


@transaction.atomic(using=_USING)
def save_scan_order(order_id, *, user=None) -> dict:
    order = ScanOrder.objects.using(_USING).get(pk=order_id)
    if not order.lines.exists():
        raise ValidationError("أضف صنفاً واحداً على الأقل بالمسح.")
    order.status = ScanOrder.Status.SAVED
    order.save(using=_USING, update_fields=["status", "updated_at"])
    return get_scan_order(order.pk)


@transaction.atomic(using=_USING)
def mark_order_printed(order_id) -> dict:
    order = ScanOrder.objects.using(_USING).get(pk=order_id)
    order.printed_at = timezone.now()
    if order.status == ScanOrder.Status.DRAFT:
        order.status = ScanOrder.Status.SAVED
    order.save(using=_USING, update_fields=["printed_at", "status", "updated_at"])
    return get_scan_order(order.pk)


@transaction.atomic(using=_USING)
def mark_order_loaded(order_id, *, target: str) -> dict:
    order = ScanOrder.objects.using(_USING).get(pk=order_id)
    if order.status not in (ScanOrder.Status.SAVED, ScanOrder.Status.LOADED):
        raise ValidationError("الأوردر غير جاهز للتحميل.")
    order.status = ScanOrder.Status.LOADED
    order.loaded_into = target
    order.save(using=_USING, update_fields=["status", "loaded_into", "updated_at"])
    return get_scan_order(order.pk)


def lookup_order_for_load(*, code: str) -> dict:
    """تحميل أوردر برقمه — للاستخدام في الشاشات الأخرى."""
    try:
        data = get_scan_order(by_code=code)
    except ScanOrder.DoesNotExist:
        raise ValidationError(f"أوردر غير موجود: {code}")
    if data["status"] == ScanOrder.Status.CANCELLED:
        raise ValidationError("الأوردر ملغى.")
    if not data.get("lines"):
        raise ValidationError("الأوردر لا يحتوي على أصناف.")
    return data
