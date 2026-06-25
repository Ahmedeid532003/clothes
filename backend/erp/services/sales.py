"""خدمات فواتير المبيعات ومردوداتها."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.accounting_models import Treasury, TreasuryMovement
from erp.sale_models import (
    CustomerReservation,
    CustomerReservationLine,
    Sale,
    SaleLine,
    SaleReturn,
    SaleReturnLine,
    SalesQuotation,
    SalesQuotationLine,
)
from erp.services import catalog as catalog_service
from erp.services.pos import _line_total
from erp.services.stock import _adjust_balance

_USING = "tenant"


def _already_returned_qty(line: SaleLine) -> Decimal:
    return (
        SaleReturnLine.objects.using(_USING)
        .filter(sale_line=line, sale_return__status=SaleReturn.Status.POSTED)
        .aggregate(total=Sum("quantity"))["total"]
        or Decimal("0")
    )


def _restore_line_stock(*, sale_return: SaleReturn, sale_line: SaleLine, qty: Decimal) -> None:
    if sale_line.variant_id:
        _adjust_balance(sale_return.warehouse_id, sale_line.variant_id, qty)
        return
    if sale_line.composite_product_id:
        for component in sale_line.composite_product.lines.select_related("variant").all():
            _adjust_balance(
                sale_return.warehouse_id,
                component.variant_id,
                qty * component.quantity,
            )


def _post_cash_refund(*, sale_return: SaleReturn, user) -> None:
    if sale_return.refund_method != SaleReturn.RefundMethod.CASH or sale_return.total <= 0:
        return
    from erp.services.accounting_vouchers import ensure_default_treasuries
    from erp.services import accounting_treasury as treasury_service

    ensure_default_treasuries()
    treasury = (
        Treasury.objects.using(_USING)
        .filter(kind=Treasury.TreasuryKind.CASH, is_active=True)
        .order_by("code")
        .first()
    )
    if not treasury:
        return
    movement = treasury_service.create_treasury_movement(
        data={
            "movement_date": timezone.localdate(),
            "movement_type": TreasuryMovement.MovementType.PAYMENT,
            "treasury": str(treasury.pk),
            "amount": str(sale_return.total),
            "branch": str(sale_return.branch_id),
            "notes": f"استرداد مردود بيع {sale_return.code}",
        },
        user=user,
    )
    treasury_service.post_treasury_movement(movement.pk, user)


def _post_cash_receipt(*, amount: Decimal, branch_id, code: str, user, notes_prefix: str) -> None:
    if amount <= 0:
        return
    from erp.services.accounting_vouchers import ensure_default_treasuries
    from erp.services import accounting_treasury as treasury_service

    ensure_default_treasuries()
    treasury = (
        Treasury.objects.using(_USING)
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
            "branch": str(branch_id),
            "notes": f"{notes_prefix} {code}",
        },
        user=user,
    )
    treasury_service.post_treasury_movement(movement.pk, user)


def _totals_from_lines(lines, discount_amount=Decimal("0"), tax_percent=Decimal("0")):
    subtotal = sum((line.line_total for line in lines), Decimal("0")).quantize(Decimal("0.01"))
    taxable = max(subtotal - Decimal(str(discount_amount or 0)), Decimal("0"))
    tax = (taxable * Decimal(str(tax_percent or 0)) / Decimal("100")).quantize(Decimal("0.01"))
    return subtotal, tax, (taxable + tax).quantize(Decimal("0.01"))


def _create_draft_lines(*, parent, line_model, rows: list[dict]):
    created = []
    for row in rows:
        qty = Decimal(str(row["quantity"]))
        unit_price = Decimal(str(row.get("unit_price") or 0))
        discount_percent = Decimal(str(row.get("discount_percent") or 0))
        if qty <= 0:
            raise ValidationError("الكمية يجب أن تكون أكبر من صفر.")
        if bool(row.get("variant")) == bool(row.get("composite")):
            raise ValidationError("حدد صنفاً أو عرضاً مركباً، وليس الاثنين.")
        created.append(
            line_model.objects.using(_USING).create(
                **parent,
                variant_id=row.get("variant"),
                composite_product_id=row.get("composite"),
                quantity=qty,
                unit_price=unit_price,
                discount_percent=discount_percent,
                line_total=_line_total(qty, unit_price, discount_percent),
            )
        )
    return created


def _line_payload(line) -> dict:
    payload = {
        "quantity": str(line.quantity),
        "unit_price": str(line.unit_price),
        "discount_percent": str(line.discount_percent),
    }
    if line.variant_id:
        payload["variant"] = str(line.variant_id)
    if line.composite_product_id:
        payload["composite"] = str(line.composite_product_id)
    return payload


def list_sales(*, branch=None) -> list[Sale]:
    qs = (
        Sale.objects.using(_USING)
        .select_related("branch", "warehouse", "season", "customer", "created_by")
        .prefetch_related(
            "lines__variant__product",
            "lines__variant__size",
            "lines__variant__color",
            "lines__composite_product",
            "payments",
        )
        .order_by("-created_at")[:300]
    )
    if branch:
        qs = qs.filter(branch=branch)
    return list(qs)


def sale_detail(pk) -> Sale:
    return (
        Sale.objects.using(_USING)
        .select_related("branch", "warehouse", "season", "customer", "created_by")
        .prefetch_related(
            "lines__variant__product",
            "lines__variant__size",
            "lines__variant__color",
            "lines__composite_product",
            "payments",
        )
        .get(pk=pk)
    )


@transaction.atomic(using=_USING)
def create_sale_return(*, sale_id, data: dict, user) -> SaleReturn:
    sale = sale_detail(sale_id)
    if sale.status != Sale.Status.COMPLETED:
        raise ValidationError("لا يمكن عمل مردود إلا لفاتورة مكتملة.")
    rows = data.get("lines") or []
    if not rows:
        raise ValidationError("أضف بنداً واحداً على الأقل للمردود.")

    from erp.services.accounting_vouchers import get_open_shift_for_user

    open_shift = get_open_shift_for_user(user)

    ret = SaleReturn.objects.using(_USING).create(
        code=catalog_service._next_code("SRT", SaleReturn),
        sale=sale,
        branch=sale.branch,
        warehouse=sale.warehouse,
        customer=sale.customer,
        refund_method=data.get("refund_method") or SaleReturn.RefundMethod.CASH,
        down_payment_refund=Decimal(str(data.get("down_payment_refund") or 0)),
        return_interest=Decimal(str(data.get("return_interest") or 0)),
        reason=(data.get("reason") or "").strip(),
        notes=(data.get("notes") or "").strip(),
        created_by=user,
        cash_shift=open_shift or sale.cash_shift,
        status=SaleReturn.Status.POSTED,
    )

    subtotal = Decimal("0")
    line_map = {str(line.pk): line for line in sale.lines.all()}
    for row in rows:
        line = line_map.get(str(row.get("sale_line")))
        if not line:
            raise ValidationError("بند المردود غير موجود في الفاتورة.")
        qty = Decimal(str(row.get("quantity") or 0))
        if qty <= 0:
            raise ValidationError("كمية المردود يجب أن تكون أكبر من صفر.")
        available = line.quantity - _already_returned_qty(line)
        if qty > available:
            raise ValidationError(f"كمية المردود أكبر من المتاح. المتاح: {available}")
        line_total = _line_total(qty, line.unit_price, line.discount_percent)
        SaleReturnLine.objects.using(_USING).create(
            sale_return=ret,
            sale_line=line,
            variant_id=line.variant_id,
            composite_product_id=line.composite_product_id,
            quantity=qty,
            unit_price=line.unit_price,
            discount_percent=line.discount_percent,
            line_total=line_total,
        )
        _restore_line_stock(sale_return=ret, sale_line=line, qty=qty)
        subtotal += line_total

    ret.subtotal = subtotal.quantize(Decimal("0.01"))
    if sale.subtotal > 0 and sale.tax_amount > 0:
        ret.tax_amount = (ret.subtotal * sale.tax_amount / sale.subtotal).quantize(Decimal("0.01"))
    ret.total = (ret.subtotal + ret.tax_amount).quantize(Decimal("0.01"))

    if ret.return_interest <= 0 and sale.subtotal > 0:
        from erp.receivable_models import InstallmentContract, ReceivableInvoice

        ri = ReceivableInvoice.objects.using(_USING).filter(sale=sale).first()
        contract = None
        if ri:
            contract = InstallmentContract.objects.using(_USING).filter(receivable=ri).first()
        if contract and contract.interest_amount > 0:
            ratio = ret.subtotal / sale.subtotal
            ret.return_interest = (contract.interest_amount * ratio).quantize(Decimal("0.01"))

    ret.save(using=_USING, update_fields=["subtotal", "tax_amount", "total", "return_interest"])
    _post_cash_refund(sale_return=ret, user=user)
    if ret.refund_method == SaleReturn.RefundMethod.CASH:
        from erp.accounting_models import ShiftMovement
        from erp.services.accounting_vouchers import record_shift_movement_for_user

        goods_refund = max(ret.total - (ret.down_payment_refund or Decimal("0")), Decimal("0"))
        if goods_refund > 0:
            record_shift_movement_for_user(
                user,
                ShiftMovement.MovementType.RETURN,
                goods_refund,
                reference=ret.code,
                notes="مرتجع عملاء",
            )
        if (ret.down_payment_refund or Decimal("0")) > 0:
            record_shift_movement_for_user(
                user,
                ShiftMovement.MovementType.RETURN,
                ret.down_payment_refund,
                reference=ret.code,
                notes="رد مقدم-حجز",
            )
    return ret


def list_sale_returns() -> list[SaleReturn]:
    return list(
        SaleReturn.objects.using(_USING)
        .select_related("sale", "branch", "warehouse", "customer", "created_by")
        .prefetch_related(
            "lines__sale_line",
            "lines__variant__product",
            "lines__variant__size",
            "lines__variant__color",
            "lines__composite_product",
        )
        .order_by("-created_at")[:300]
    )


# ——— Quotations ———


def list_quotations() -> list[SalesQuotation]:
    return list(
        SalesQuotation.objects.using(_USING)
        .select_related("branch", "warehouse", "customer", "converted_sale")
        .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color", "lines__composite_product")
        .order_by("-created_at")[:300]
    )


def quotation_detail(pk) -> SalesQuotation:
    return (
        SalesQuotation.objects.using(_USING)
        .select_related("branch", "warehouse", "customer", "converted_sale")
        .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color", "lines__composite_product")
        .get(pk=pk)
    )


def lookup_quotation(*, code: str) -> SalesQuotation:
    c = (code or "").strip()
    if not c:
        raise ValidationError("أدخل رقم عرض السعر.")
    try:
        row = SalesQuotation.objects.using(_USING).get(code__iexact=c)
        return quotation_detail(row.pk)
    except SalesQuotation.DoesNotExist as exc:
        raise ValidationError("عرض السعر غير موجود.") from exc


@transaction.atomic(using=_USING)
def create_quotation(*, branch, warehouse, data: dict, user) -> SalesQuotation:
    rows = data.get("lines") or []
    if not rows:
        raise ValidationError("أضف بنداً واحداً على الأقل.")
    q = SalesQuotation.objects.using(_USING).create(
        code=catalog_service._next_code("QTN", SalesQuotation),
        branch=branch,
        warehouse=warehouse,
        customer_id=data.get("customer"),
        discount_amount=Decimal(str(data.get("discount_amount") or 0)),
        tax_percent=Decimal(str(data.get("tax_percent") or 0)),
        valid_until=data.get("valid_until"),
        notes=(data.get("notes") or "").strip(),
        created_by=user,
    )
    lines = _create_draft_lines(parent={"quotation": q}, line_model=SalesQuotationLine, rows=rows)
    q.subtotal, q.tax_amount, q.total = _totals_from_lines(lines, q.discount_amount, q.tax_percent)
    q.save(using=_USING, update_fields=["subtotal", "tax_amount", "total", "updated_at"])
    return q


@transaction.atomic(using=_USING)
def approve_quotation(pk) -> SalesQuotation:
    q = SalesQuotation.objects.using(_USING).get(pk=pk)
    if q.status == SalesQuotation.Status.CONVERTED:
        raise ValidationError("عرض السعر تحول لفاتورة بالفعل.")
    q.status = SalesQuotation.Status.APPROVED
    q.save(using=_USING, update_fields=["status", "updated_at"])
    return q


@transaction.atomic(using=_USING)
def convert_quotation_to_sale(pk, user) -> Sale:
    from erp.services import pos as pos_service

    q = quotation_detail(pk)
    if q.status == SalesQuotation.Status.CONVERTED:
        raise ValidationError("عرض السعر تحول لفاتورة بالفعل.")
    sale = pos_service.create_sale(
        branch=q.branch,
        user=user,
        data={
            "customer": str(q.customer_id) if q.customer_id else None,
            "payment_method": Sale.PaymentMethod.CASH,
            "discount_amount": str(q.discount_amount),
            "tax_percent": str(q.tax_percent),
            "lines": [_line_payload(line) for line in q.lines.all()],
            "notes": f"تحويل من عرض سعر {q.code}",
        },
    )
    q.status = SalesQuotation.Status.CONVERTED
    q.converted_sale = sale
    q.save(using=_USING, update_fields=["status", "converted_sale", "updated_at"])
    return sale


# ——— Reservations ———


def list_reservations() -> list[CustomerReservation]:
    return list(
        CustomerReservation.objects.using(_USING)
        .select_related("branch", "warehouse", "customer", "converted_sale")
        .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color", "lines__composite_product")
        .order_by("-created_at")[:300]
    )


def reservation_detail(pk) -> CustomerReservation:
    return (
        CustomerReservation.objects.using(_USING)
        .select_related("branch", "warehouse", "customer", "converted_sale")
        .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color", "lines__composite_product")
        .get(pk=pk)
    )


def lookup_reservation(*, code: str) -> CustomerReservation:
    c = (code or "").strip()
    if not c:
        raise ValidationError("أدخل رقم الحجز.")
    try:
        row = CustomerReservation.objects.using(_USING).get(code__iexact=c)
        return reservation_detail(row.pk)
    except CustomerReservation.DoesNotExist as exc:
        raise ValidationError("الحجز غير موجود.") from exc


@transaction.atomic(using=_USING)
def create_reservation(*, branch, warehouse, data: dict, user) -> CustomerReservation:
    rows = data.get("lines") or []
    if not rows:
        raise ValidationError("أضف بنداً واحداً على الأقل.")
    customer_id = data.get("customer") or None
    r = CustomerReservation.objects.using(_USING).create(
        code=catalog_service._next_code("RSV", CustomerReservation),
        branch=branch,
        warehouse=warehouse,
        customer_id=customer_id,
        discount_amount=Decimal(str(data.get("discount_amount") or 0)),
        deposit_amount=Decimal(str(data.get("deposit_amount") or 0)),
        deposit_method=data.get("deposit_method") or Sale.PaymentMethod.CASH,
        notes=(data.get("notes") or "").strip(),
        created_by=user,
    )
    lines = _create_draft_lines(parent={"reservation": r}, line_model=CustomerReservationLine, rows=rows)
    subtotal, _, total = _totals_from_lines(lines, r.discount_amount, Decimal("0"))
    r.subtotal = subtotal
    r.total = total
    r.save(using=_USING, update_fields=["subtotal", "total", "updated_at"])
    if r.deposit_method == Sale.PaymentMethod.CASH:
        _post_cash_receipt(
            amount=r.deposit_amount,
            branch_id=r.branch_id,
            code=r.code,
            user=user,
            notes_prefix="عربون حجز",
        )
    return r


@transaction.atomic(using=_USING)
def convert_reservation_to_sale(pk, user) -> Sale:
    from erp.services import pos as pos_service

    r = reservation_detail(pk)
    if r.status == CustomerReservation.Status.CONVERTED:
        raise ValidationError("الحجز تحول لفاتورة بالفعل.")
    remaining = max(r.total - r.deposit_amount, Decimal("0")).quantize(Decimal("0.01"))
    payments = []
    if r.deposit_amount > 0:
        payments.append(
            {
                "payment_method": Sale.PaymentMethod.RESERVED,
                "amount": r.deposit_amount,
                "reference": f"عربون {r.code}",
            }
        )
    if remaining > 0:
        payments.append(
            {
                "payment_method": Sale.PaymentMethod.CASH,
                "amount": remaining,
                "reference": "",
            }
        )
    sale = pos_service.create_sale(
        branch=r.branch,
        user=user,
        data={
            "customer": str(r.customer_id) if r.customer_id else None,
            "payment_method": Sale.PaymentMethod.MIXED if len(payments) > 1 else (payments[0]["payment_method"] if payments else Sale.PaymentMethod.CASH),
            "discount_amount": str(r.discount_amount),
            "payments": payments,
            "lines": [_line_payload(line) for line in r.lines.all()],
            "notes": f"تحويل من حجز {r.code}",
        },
    )
    r.status = CustomerReservation.Status.CONVERTED
    r.converted_sale = sale
    r.save(using=_USING, update_fields=["status", "converted_sale", "updated_at"])
    return sale

