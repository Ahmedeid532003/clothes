"""خدمات فواتير الشراء واستلام المخزن."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from django.db.models import Count, Q, Sum

from erp.accounting_models import GlAccount, JournalEntry, JournalLine
from erp.product_models import Product, ProductVariant, StockBalance
from erp.purchase_models import PurchaseInvoice, PurchaseInvoiceLine
from erp.services import catalog as catalog_service
from erp.services.stock import _adjust_balance
from erp.supplier_models import SupplierAccountEntry

_USING = "tenant"


def _line_amounts(
    qty: Decimal, unit_cost: Decimal, discount_percent: Decimal, tax_percent: Decimal
) -> tuple[Decimal, Decimal, Decimal]:
    gross = qty * unit_cost
    net = gross
    if discount_percent > 0:
        net = gross * (Decimal("1") - discount_percent / Decimal("100"))
    net = net.quantize(Decimal("0.01"))
    tax = Decimal("0")
    if tax_percent > 0:
        tax = (net * tax_percent / Decimal("100")).quantize(Decimal("0.01"))
    total = (net + tax).quantize(Decimal("0.01"))
    return net, tax, total


def _line_total(qty: Decimal, unit_cost: Decimal, discount_percent: Decimal, tax_percent: Decimal) -> Decimal:
    return _line_amounts(qty, unit_cost, discount_percent, tax_percent)[2]


def _validate_product_for_invoice(product: Product, invoice: PurchaseInvoice) -> None:
    if product.supplier_id and product.supplier_id != invoice.supplier_id:
        raise ValidationError(f"الصنف {product.code} لا يتبع المورد المختار — تم الرفض.")
    if product.season_id != invoice.season_id:
        raise ValidationError(f"الصنف {product.code} لا يتبع الموسم المختار — تم الرفض.")
    if invoice.brand_id and product.brand_id and product.brand_id != invoice.brand_id:
        raise ValidationError(f"الصنف {product.code} لا يتبع البراند المختار — تم الرفض.")


def _resolve_variant_for_line(row: dict, invoice: PurchaseInvoice) -> ProductVariant:
    if row.get("variant"):
        variant = (
            ProductVariant.objects.using(_USING)
            .select_related("product")
            .get(pk=row["variant"], is_active=True)
        )
        _validate_product_for_invoice(variant.product, invoice)
        return variant

    product_id = row.get("product")
    size_id = row.get("size")
    color_id = row.get("color")
    if not (product_id and size_id and color_id):
        raise ValidationError("كل بند يحتاج variant أو (product + size + color).")

    product = Product.objects.using(_USING).get(pk=product_id, is_active=True)
    _validate_product_for_invoice(product, invoice)
    variants = catalog_service.sync_product_variants(
        product, size_ids=[size_id], color_ids=[color_id]
    )
    return variants[0]


def _apply_header_from_data(invoice: PurchaseInvoice, data: dict) -> None:
    invoice.supplier_id = data["supplier"]
    invoice.season_id = data["season"]
    invoice.brand_id = data.get("brand")
    invoice.warehouse_id = data["warehouse"]
    invoice.branch_id = data.get("branch")
    invoice.invoice_date = data.get("invoice_date") or invoice.invoice_date
    invoice.notes = (data.get("notes") or "").strip()
    invoice.discount_amount = Decimal(str(data.get("discount_amount") or 0))
    invoice.payment_method = data.get("payment_method") or PurchaseInvoice.PaymentMethod.CREDIT
    invoice.source_invoice_id = data.get("source_invoice")
    if invoice.invoice_type == PurchaseInvoice.InvoiceType.RETURN:
        invoice.return_reason = (data.get("return_reason") or "").strip()
    else:
        invoice.return_reason = ""
    invoice.save(
        using=_USING,
        update_fields=[
            "supplier_id",
            "season_id",
            "brand_id",
            "warehouse_id",
            "branch_id",
            "invoice_date",
            "notes",
            "discount_amount",
            "payment_method",
            "source_invoice_id",
            "return_reason",
            "updated_at",
        ],
    )


def _create_lines(invoice: PurchaseInvoice, lines_data: list) -> None:
    for row in lines_data:
        variant = _resolve_variant_for_line(row, invoice)
        qty = Decimal(str(row["quantity"]))
        unit_cost = Decimal(str(row["unit_cost"]))
        discount_percent = Decimal(str(row.get("discount_percent") or 0))
        tax_percent = Decimal(str(row.get("tax_percent") or 0))
        PurchaseInvoiceLine.objects.using(_USING).create(
            invoice=invoice,
            variant=variant,
            quantity=qty,
            unit_cost=unit_cost,
            discount_percent=discount_percent,
            tax_percent=tax_percent,
            line_total=_line_total(qty, unit_cost, discount_percent, tax_percent),
        )


def _update_weighted_avg_cost(
    *, warehouse_id, variant: ProductVariant, incoming_qty: Decimal, unit_cost: Decimal
) -> None:
    if incoming_qty <= 0:
        return
    bal = (
        StockBalance.objects.using(_USING)
        .filter(warehouse_id=warehouse_id, variant_id=variant.id)
        .first()
    )
    old_qty = bal.quantity if bal else Decimal("0")
    product = variant.product
    old_cost = variant.purchase_price or product.purchase_price or Decimal("0")
    new_qty = old_qty + incoming_qty
    if new_qty <= 0:
        return
    new_avg = ((old_qty * old_cost) + (incoming_qty * unit_cost)) / new_qty
    new_avg = new_avg.quantize(Decimal("0.01"))
    variant.purchase_price = new_avg
    product.purchase_price = new_avg
    update_fields = ["purchase_price"]
    if product.markup_percent:
        product.sale_price = catalog_service.compute_sale_price(
            new_avg, product.markup_percent
        )
        update_fields.append("sale_price")
    variant.save(using=_USING, update_fields=["purchase_price"])
    product.save(using=_USING, update_fields=update_fields + ["updated_at"])


def _adjust_cost_on_return(
    *, warehouse_id, variant: ProductVariant, outgoing_qty: Decimal, unit_cost: Decimal
) -> None:
    """عكس متوسط التكلفة عند إرجاع بضاعة للمورد."""
    bal = (
        StockBalance.objects.using(_USING)
        .filter(warehouse_id=warehouse_id, variant_id=variant.id)
        .first()
    )
    old_qty = bal.quantity if bal else Decimal("0")
    if old_qty <= 0 or outgoing_qty <= 0:
        return
    product = variant.product
    old_cost = variant.purchase_price or product.purchase_price or unit_cost
    new_qty = old_qty - outgoing_qty
    if new_qty <= 0:
        new_avg = unit_cost
    else:
        total_value = (old_qty * old_cost) - (outgoing_qty * unit_cost)
        if total_value < 0:
            total_value = Decimal("0")
        new_avg = (total_value / new_qty).quantize(Decimal("0.01"))
    variant.purchase_price = new_avg
    product.purchase_price = new_avg
    update_fields = ["purchase_price"]
    if product.markup_percent:
        product.sale_price = catalog_service.compute_sale_price(
            new_avg, product.markup_percent
        )
        update_fields.append("sale_price")
    variant.save(using=_USING, update_fields=["purchase_price"])
    product.save(using=_USING, update_fields=update_fields + ["updated_at"])


def _validate_return_stock(invoice: PurchaseInvoice, line: PurchaseInvoiceLine) -> None:
    bal = (
        StockBalance.objects.using(_USING)
        .filter(warehouse_id=invoice.warehouse_id, variant_id=line.variant_id)
        .first()
    )
    available = bal.quantity if bal else Decimal("0")
    if line.quantity > available:
        product = line.variant.product
        raise ValidationError(
            f"رصيد غير كافٍ لـ {product.code}: متاح {available} — مطلوب إرجاع {line.quantity}."
        )


def _get_purchase_gl_accounts():
    inventory_gl, _ = GlAccount.objects.using(_USING).get_or_create(
        code="1300",
        defaults={
            "name_ar": "مخزون البضاعة",
            "name_en": "Inventory",
            "account_type": GlAccount.AccountType.ASSET,
            "is_active": True,
        },
    )
    payable_gl, _ = GlAccount.objects.using(_USING).get_or_create(
        code="2100",
        defaults={
            "name_ar": "موردون — أرصدة دائنة",
            "name_en": "Accounts Payable",
            "account_type": GlAccount.AccountType.LIABILITY,
            "is_active": True,
        },
    )
    cash_gl, _ = GlAccount.objects.using(_USING).get_or_create(
        code="1100",
        defaults={
            "name_ar": "صندوق / نقدية",
            "name_en": "Cash",
            "account_type": GlAccount.AccountType.ASSET,
            "is_active": True,
        },
    )
    tax_gl, _ = GlAccount.objects.using(_USING).get_or_create(
        code="2200",
        defaults={
            "name_ar": "ضريبة المشتريات",
            "name_en": "Purchase Tax",
            "account_type": GlAccount.AccountType.LIABILITY,
            "is_active": True,
        },
    )
    return inventory_gl, payable_gl, cash_gl, tax_gl


def _post_purchase_journal(invoice: PurchaseInvoice, user) -> JournalEntry | None:
    if invoice.total <= 0:
        return None
    inventory_gl, payable_gl, cash_gl, tax_gl = _get_purchase_gl_accounts()
    is_return = invoice.invoice_type == PurchaseInvoice.InvoiceType.RETURN
    sign = Decimal("-1") if is_return else Decimal("1")
    inventory_value = (invoice.subtotal - (invoice.discount_amount or Decimal("0"))).quantize(
        Decimal("0.01")
    )
    tax_value = invoice.tax_amount or Decimal("0")
    total = invoice.total

    credit_gl = (
        cash_gl
        if invoice.payment_method == PurchaseInvoice.PaymentMethod.CASH
        else payable_gl
    )

    je_code = catalog_service._next_code("JE", JournalEntry)
    journal = JournalEntry.objects.using(_USING).create(
        code=je_code,
        entry_date=invoice.invoice_date,
        description=f"{'مرتجع شراء' if is_return else 'فاتورة شراء'} — {invoice.code}",
        status=JournalEntry.Status.POSTED,
        entry_kind=JournalEntry.EntryKind.SYSTEM,
        source_type="purchase_invoice",
        source_id=invoice.pk,
        total_debit=total,
        total_credit=total,
        posted_at=timezone.now(),
        approved_by=user,
        approved_at=timezone.now(),
        created_by=user,
    )
    order = 1
    inv_amt = sign * inventory_value
    if inv_amt != 0:
        JournalLine.objects.using(_USING).create(
            journal=journal,
            gl_account=inventory_gl,
            debit=inv_amt if inv_amt > 0 else Decimal("0"),
            credit=-inv_amt if inv_amt < 0 else Decimal("0"),
            line_order=order,
            memo=invoice.supplier.name_ar,
        )
        order += 1
    tax_amt = sign * tax_value
    if tax_amt != 0:
        JournalLine.objects.using(_USING).create(
            journal=journal,
            gl_account=tax_gl,
            debit=tax_amt if tax_amt > 0 else Decimal("0"),
            credit=-tax_amt if tax_amt < 0 else Decimal("0"),
            line_order=order,
            memo="ضريبة",
        )
        order += 1
    cr_amt = sign * total
    JournalLine.objects.using(_USING).create(
        journal=journal,
        gl_account=credit_gl,
        debit=-cr_amt if cr_amt < 0 else Decimal("0"),
        credit=cr_amt if cr_amt > 0 else Decimal("0"),
        line_order=order,
        memo=invoice.supplier.name_ar,
    )
    return journal


def _post_supplier_account(invoice: PurchaseInvoice) -> SupplierAccountEntry | None:
    if invoice.payment_method == PurchaseInvoice.PaymentMethod.CASH:
        if invoice.invoice_type != PurchaseInvoice.InvoiceType.RETURN:
            return None
    if invoice.total <= 0:
        return None

    is_return = invoice.invoice_type == PurchaseInvoice.InvoiceType.RETURN
    entry_type = (
        SupplierAccountEntry.EntryType.CREDIT
        if is_return
        else SupplierAccountEntry.EntryType.DEBIT
    )
    entry_code = catalog_service._next_code("SA", SupplierAccountEntry)
    label = "مرتجع شراء" if is_return else "فاتورة شراء"
    return SupplierAccountEntry.objects.using(_USING).create(
        code=entry_code,
        supplier=invoice.supplier,
        purchase_invoice=invoice,
        entry_type=entry_type,
        amount=invoice.total,
        notes=f"{label} — {invoice.code}",
    )


@transaction.atomic(using=_USING)
def quick_create_product_for_purchase(*, data: dict) -> Product:
    size_ids = data.get("size_ids") or []
    color_ids = data.get("color_ids") or []
    if not size_ids or not color_ids:
        raise ValidationError("اختر مقاسًا ولونًا واحدًا على الأقل للصنف الجديد.")
    payload = {
        "name_ar": data["name_ar"],
        "name_en": data.get("name_en", data["name_ar"]),
        "barcode": data.get("barcode", ""),
        "supplier": data.get("supplier"),
        "season": data.get("season"),
        "brand": data.get("brand"),
        "purchase_price": data.get("purchase_price", 0),
        "markup_percent": data.get("markup_percent", 0),
        "size_ids": size_ids,
        "color_ids": color_ids,
    }
    return catalog_service.create_product(data=payload)


def serialize_purchase_lookup_products(
    qs,
    *,
    warehouse_id: str | None = None,
    invoice_supplier_id: str | None = None,
    invoice_season_id: str | None = None,
) -> list[dict]:
    from erp.serializers_inventory import ProductSerializer

    products = list(qs)
    product_ids = [p.id for p in products]
    variant_ids: list = []
    variants_by_product: dict = {}
    for product in products:
        pvars = list(product.variants.all())
        variants_by_product[product.id] = pvars
        variant_ids.extend(v.id for v in pvars)

    stock_map: dict[str, str] = {}
    total_stock_map: dict[str, str] = {}
    if variant_ids:
        wh_filter = StockBalance.objects.using(_USING).filter(variant_id__in=variant_ids)
        if warehouse_id:
            for row in wh_filter.filter(warehouse_id=warehouse_id):
                stock_map[str(row.variant_id)] = str(
                    row.quantity.quantize(Decimal("0.001"))
                )
        for row in (
            wh_filter.values("variant__product_id")
            .annotate(total=Sum("quantity"))
            .order_by()
        ):
            pid = str(row["variant__product_id"])
            total_stock_map[pid] = str(
                (row["total"] or Decimal("0")).quantize(Decimal("0.001"))
            )

    purchase_count_map: dict[str, int] = {}
    if product_ids:
        for row in (
            PurchaseInvoiceLine.objects.using(_USING)
            .filter(
                variant__product_id__in=product_ids,
                invoice__invoice_type=PurchaseInvoice.InvoiceType.PURCHASE,
                invoice__status=PurchaseInvoice.Status.RECEIVED,
            )
            .values("variant__product_id")
            .annotate(c=Count("id"))
        ):
            purchase_count_map[str(row["variant__product_id"])] = row["c"]

    out = []
    for product in products:
        data = ProductSerializer(product).data
        pid = str(product.id)
        if warehouse_id:
            for variant in data.get("variants") or []:
                variant["warehouse_qty"] = stock_map.get(variant["id"], "0")
        matches_supplier = (
            not invoice_supplier_id or str(product.supplier_id) == str(invoice_supplier_id)
        )
        matches_season = (
            not invoice_season_id or str(product.season_id) == str(invoice_season_id)
        )
        data["matches_supplier"] = matches_supplier
        data["matches_season"] = matches_season
        data["matches_invoice"] = matches_supplier and matches_season
        data["purchase_count"] = purchase_count_map.get(pid, 0)
        data["total_stock_qty"] = total_stock_map.get(pid, "0")
        out.append(data)
    return out


def search_products_for_purchase(
    *,
    supplier_id: str | None = None,
    season_id: str | None = None,
    brand_id: str | None = None,
    section_id: str | None = None,
    classification_id: str | None = None,
    query: str = "",
    compare_mode: bool = False,
):
    qs = (
        Product.objects.using(_USING)
        .filter(is_active=True)
        .select_related("brand", "section", "classification", "supplier", "season")
        .prefetch_related("variants__size", "variants__color")
    )
    if not compare_mode:
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if season_id:
            qs = qs.filter(season_id=season_id)
    if brand_id:
        qs = qs.filter(brand_id=brand_id)
    if section_id:
        qs = qs.filter(section_id=section_id)
    if classification_id:
        qs = qs.filter(classification_id=classification_id)
    q = (query or "").strip()
    if q:
        parts = [p.strip() for p in q.split() if p.strip()]
        for part in parts:
            # بحث Google-like: كل كلمة يجب أن تطابق أي حقل (AND بين الكلمات)
            qs = qs.filter(
                Q(code__icontains=part)
                | Q(barcode__icontains=part)
                | Q(name_ar__icontains=part)
                | Q(name_en__icontains=part)
                | Q(description__icontains=part)
                | Q(brand__name_ar__icontains=part)
                | Q(brand__name_en__icontains=part)
                | Q(supplier__name_ar__icontains=part)
                | Q(season__name_ar__icontains=part)
                | Q(season__name_en__icontains=part)
                | Q(section__name_ar__icontains=part)
                | Q(section__name_en__icontains=part)
                | Q(classification__name_ar__icontains=part)
                | Q(classification__name_en__icontains=part)
            )
    return qs.order_by("code")[:100]


def _recalc_invoice_totals(invoice: PurchaseInvoice) -> PurchaseInvoice:
    lines = invoice.lines.all()
    subtotal = Decimal("0")
    tax_amount = Decimal("0")
    for ln in lines:
        net, tax, _ = _line_amounts(
            ln.quantity, ln.unit_cost, ln.discount_percent, ln.tax_percent
        )
        subtotal += net
        tax_amount += tax
    invoice.subtotal = subtotal.quantize(Decimal("0.01"))
    invoice.tax_amount = tax_amount.quantize(Decimal("0.01"))
    invoice.total = (
        invoice.subtotal + invoice.tax_amount - (invoice.discount_amount or Decimal("0"))
    ).quantize(Decimal("0.01"))
    invoice.save(
        using=_USING,
        update_fields=["subtotal", "tax_amount", "total", "updated_at"],
    )
    return invoice


@transaction.atomic(using=_USING)
def create_purchase_invoice(*, data: dict, user, invoice_type: str = "purchase") -> PurchaseInvoice:
    lines_data = data.get("lines") or []
    if not lines_data:
        raise ValidationError("أضف بندًا واحدًا على الأقل.")

    code = (data.get("code") or "").strip() or catalog_service._next_code(
        "PI" if invoice_type == "purchase" else "PR",
        PurchaseInvoice,
    )
    invoice = PurchaseInvoice.objects.using(_USING).create(
        code=code,
        invoice_type=invoice_type,
        supplier_id=data["supplier"],
        season_id=data["season"],
        brand_id=data.get("brand"),
        warehouse_id=data["warehouse"],
        branch_id=data.get("branch"),
        invoice_date=data.get("invoice_date") or timezone.localdate(),
        notes=(data.get("notes") or "").strip(),
        discount_amount=Decimal(str(data.get("discount_amount") or 0)),
        payment_method=data.get("payment_method") or PurchaseInvoice.PaymentMethod.CREDIT,
        source_invoice_id=data.get("source_invoice"),
        return_reason=(
            (data.get("return_reason") or "").strip() if invoice_type == "return" else ""
        ),
        created_by=user,
    )
    _create_lines(invoice, lines_data)
    return _recalc_invoice_totals(invoice)


@transaction.atomic(using=_USING)
def update_purchase_invoice(invoice_id, *, data: dict) -> PurchaseInvoice:
    invoice = (
        PurchaseInvoice.objects.using(_USING)
        .select_for_update()
        .get(pk=invoice_id)
    )
    if invoice.status != PurchaseInvoice.Status.DRAFT:
        raise ValidationError("لا يمكن تعديل فاتورة غير مسودة.")

    lines_data = data.get("lines") or []
    if not lines_data:
        raise ValidationError("أضف بندًا واحدًا على الأقل.")

    _apply_header_from_data(invoice, data)
    invoice.lines.all().delete()
    _create_lines(invoice, lines_data)
    return _recalc_invoice_totals(invoice)


@transaction.atomic(using=_USING)
def delete_purchase_invoice(invoice_id) -> None:
    invoice = (
        PurchaseInvoice.objects.using(_USING)
        .select_for_update()
        .get(pk=invoice_id)
    )
    if invoice.status != PurchaseInvoice.Status.DRAFT:
        raise ValidationError("لا يمكن حذف فاتورة غير مسودة — استخدم الإلغاء.")
    invoice.delete()


@transaction.atomic(using=_USING)
def receive_purchase_invoice(invoice_id, user) -> PurchaseInvoice:
    invoice = (
        PurchaseInvoice.objects.using(_USING)
        .select_for_update()
        .prefetch_related("lines__variant__product", "supplier")
        .get(pk=invoice_id)
    )
    if invoice.status != PurchaseInvoice.Status.DRAFT:
        raise ValidationError("لا يمكن استلام فاتورة غير مسودة.")
    if not invoice.lines.exists():
        raise ValidationError("الفاتورة بدون بنود.")
    if (
        invoice.invoice_type == PurchaseInvoice.InvoiceType.RETURN
        and not (invoice.return_reason or "").strip()
    ):
        raise ValidationError("حدد سبب مرتجع الشراء.")

    is_return = invoice.invoice_type == PurchaseInvoice.InvoiceType.RETURN
    sign = Decimal("-1") if is_return else Decimal("1")

    for line in invoice.lines.all():
        if is_return:
            _validate_return_stock(invoice, line)
            _adjust_cost_on_return(
                warehouse_id=invoice.warehouse_id,
                variant=line.variant,
                outgoing_qty=line.quantity,
                unit_cost=line.unit_cost,
            )
        delta = sign * line.quantity
        incoming = line.quantity if not is_return else Decimal("0")
        if incoming > 0:
            _update_weighted_avg_cost(
                warehouse_id=invoice.warehouse_id,
                variant=line.variant,
                incoming_qty=incoming,
                unit_cost=line.unit_cost,
            )
        _adjust_balance(invoice.warehouse_id, line.variant_id, delta)

    journal = _post_purchase_journal(invoice, user)
    _post_supplier_account(invoice)

    invoice.status = PurchaseInvoice.Status.RECEIVED
    invoice.received_by = user
    invoice.received_at = timezone.now()
    invoice.journal_entry = journal
    invoice.save(
        using=_USING,
        update_fields=[
            "status",
            "received_by",
            "received_at",
            "journal_entry_id",
            "updated_at",
        ],
    )
    return invoice


@transaction.atomic(using=_USING)
def cancel_purchase_invoice(invoice_id) -> PurchaseInvoice:
    invoice = PurchaseInvoice.objects.using(_USING).select_for_update().get(pk=invoice_id)
    if invoice.status == PurchaseInvoice.Status.RECEIVED:
        raise ValidationError("لا يمكن إلغاء فاتورة مستلمة.")
    invoice.status = PurchaseInvoice.Status.CANCELLED
    invoice.save(using=_USING, update_fields=["status", "updated_at"])
    return invoice
