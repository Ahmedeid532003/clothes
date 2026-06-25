"""كشف الجرد الأسبوعي للمورد — إنشاء تلقائي وإرسال واتساب."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from urllib.parse import quote

from django.db.models import Case, DecimalField, F, Q, Sum, When
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.product_models import ProductVariant, StockBalance
from erp.purchase_models import PurchaseInvoice, PurchaseInvoiceLine
from erp.sale_models import Sale, SaleLine
from erp.services import catalog as catalog_service
from erp.supplier_models import Supplier, SupplierWeeklyInventoryReport

_USING = "tenant"

WEEKDAY_FOR_DAY = {
    Supplier.WeeklyInventoryDay.SATURDAY: 5,
    Supplier.WeeklyInventoryDay.SUNDAY: 6,
    Supplier.WeeklyInventoryDay.MONDAY: 0,
    Supplier.WeeklyInventoryDay.TUESDAY: 1,
    Supplier.WeeklyInventoryDay.WEDNESDAY: 2,
    Supplier.WeeklyInventoryDay.THURSDAY: 3,
    Supplier.WeeklyInventoryDay.FRIDAY: 4,
}


def _today() -> date:
    return timezone.localdate()


def weekday_for_inventory_day(day_key: str) -> int | None:
    return WEEKDAY_FOR_DAY.get(day_key)


def build_supplier_weekly_report_data(
    *,
    supplier_id: str,
    report_date: date | None = None,
) -> dict:
    report_date = report_date or _today()
    week_end = report_date
    week_start = report_date - timedelta(days=6)

    try:
        supplier = Supplier.objects.using(_USING).get(pk=supplier_id, is_active=True)
    except Supplier.DoesNotExist:
        raise ValidationError("المورد غير موجود.")

    supplier_filter = Q(variant__product__supplier_id=supplier_id)

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
            invoice__supplier_id=supplier_id,
        )
        .values("variant_id")
        .annotate(purchased_qty=Coalesce(Sum(purchase_sign), Decimal("0")))
    )

    weekly_sales = (
        SaleLine.objects.using(_USING)
        .filter(
            sale__status=Sale.Status.COMPLETED,
            sale__created_at__date__gte=week_start,
            sale__created_at__date__lte=week_end,
        )
        .filter(supplier_filter)
        .values("variant_id")
        .annotate(sold_qty=Coalesce(Sum("quantity"), Decimal("0")))
    )

    stock = (
        StockBalance.objects.using(_USING)
        .filter(quantity__gt=0)
        .filter(supplier_filter)
        .values("variant_id")
        .annotate(stock_qty=Coalesce(Sum("quantity"), Decimal("0")))
    )

    by_variant: dict = defaultdict(
        lambda: {
            "purchased_qty": Decimal("0"),
            "sold_qty": Decimal("0"),
            "stock_qty": Decimal("0"),
        }
    )

    for row in purchases:
        vid = row["variant_id"]
        by_variant[vid]["purchased_qty"] = row["purchased_qty"] or Decimal("0")

    for row in weekly_sales:
        vid = row["variant_id"]
        by_variant[vid]["sold_qty"] = row["sold_qty"] or Decimal("0")

    for row in stock:
        vid = row["variant_id"]
        by_variant[vid]["stock_qty"] = row["stock_qty"] or Decimal("0")

    if not by_variant:
        return _empty_payload(supplier, report_date, week_start, week_end)

    variants = {
        v.id: v
        for v in ProductVariant.objects.using(_USING)
        .filter(pk__in=by_variant.keys(), is_active=True)
        .select_related("product", "size", "color")
    }

    by_product: dict = defaultdict(
        lambda: {
            "product_id": "",
            "product_code": "",
            "product_name": "",
            "sold_qty": Decimal("0"),
            "remaining_qty": Decimal("0"),
            "purchased_qty": Decimal("0"),
            "min_threshold": Decimal("0"),
            "reorder_percent": Decimal("0"),
        }
    )

    for vid, agg in by_variant.items():
        variant = variants.get(vid)
        if not variant:
            continue
        product = variant.product
        pid = str(product.id)
        bucket = by_product[pid]
        bucket["product_id"] = pid
        bucket["product_code"] = product.code
        bucket["product_name"] = product.name_ar
        bucket["reorder_percent"] = product.reorder_percent or Decimal("0")
        bucket["sold_qty"] += agg["sold_qty"]
        bucket["remaining_qty"] += agg["stock_qty"]
        bucket["purchased_qty"] += agg["purchased_qty"]

    items = []
    for bucket in by_product.values():
        purchased = bucket["purchased_qty"]
        reorder_pct = bucket["reorder_percent"]
        min_threshold = (
            (purchased * reorder_pct / Decimal("100")).quantize(Decimal("0.001"))
            if purchased > 0 and reorder_pct > 0
            else Decimal("0")
        )
        bucket["min_threshold"] = min_threshold
        items.append(
            {
                "product_id": bucket["product_id"],
                "product_code": bucket["product_code"],
                "product_name": bucket["product_name"],
                "sold_qty": str(bucket["sold_qty"].quantize(Decimal("0.001"))),
                "remaining_qty": str(bucket["remaining_qty"].quantize(Decimal("0.001"))),
                "min_threshold": str(min_threshold),
                "reorder_percent": str(reorder_pct),
            }
        )

    items.sort(key=lambda r: (r["product_code"], r["product_name"]))

    def _qty(item: dict, key: str) -> Decimal:
        return Decimal(item[key])

    top_sellers = sorted(items, key=lambda r: _qty(r, "sold_qty"), reverse=True)[:5]
    near_depletion = [
        i
        for i in items
        if _qty(i, "min_threshold") > 0 and _qty(i, "remaining_qty") <= _qty(i, "min_threshold")
    ]
    stagnant = [i for i in items if _qty(i, "sold_qty") == 0 and _qty(i, "remaining_qty") > 0]

    total_sold = sum(_qty(i, "sold_qty") for i in items)
    total_remaining = sum(_qty(i, "remaining_qty") for i in items)

    return {
        "supplier_id": str(supplier.id),
        "supplier_code": supplier.code,
        "supplier_name": supplier.name_ar,
        "supplier_whatsapp": supplier.whatsapp,
        "report_date": report_date.isoformat(),
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "items": items,
        "indicators": {
            "top_sellers": top_sellers,
            "near_depletion": near_depletion[:10],
            "stagnant": stagnant[:10],
        },
        "totals": {
            "sold_qty": str(total_sold.quantize(Decimal("0.001"))),
            "remaining_qty": str(total_remaining.quantize(Decimal("0.001"))),
            "item_count": len(items),
        },
    }


def _empty_payload(supplier, report_date, week_start, week_end) -> dict:
    return {
        "supplier_id": str(supplier.id),
        "supplier_code": supplier.code,
        "supplier_name": supplier.name_ar,
        "supplier_whatsapp": supplier.whatsapp,
        "report_date": report_date.isoformat(),
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "items": [],
        "indicators": {"top_sellers": [], "near_depletion": [], "stagnant": []},
        "totals": {"sold_qty": "0", "remaining_qty": "0", "item_count": 0},
    }


def build_whatsapp_message(payload: dict) -> str:
    name = payload.get("supplier_name") or ""
    report_date = payload.get("report_date") or ""
    totals = payload.get("totals") or {}
    indicators = payload.get("indicators") or {}
    near_count = len(indicators.get("near_depletion") or [])
    stagnant_count = len(indicators.get("stagnant") or [])
    top = indicators.get("top_sellers") or []
    top_line = ""
    if top:
        first = top[0]
        top_line = f"\nأعلى صنف مبيعاً: {first.get('product_name')} ({first.get('sold_qty')})"
    return (
        f"السلام عليكم، كشف الجرد الأسبوعي لفرعنا.\n"
        f"المورد: {name}\n"
        f"التاريخ: {report_date}\n"
        f"إجمالي المباع: {totals.get('sold_qty', '0')}\n"
        f"أصناف قاربت النفاد: {near_count}\n"
        f"أصناف راكدة: {stagnant_count}"
        f"{top_line}\n"
        f"يرجى مراجعة التفاصيل الكاملة في النظام."
    )


def whatsapp_url_for_report(payload: dict) -> str | None:
    phone = "".join(x for x in (payload.get("supplier_whatsapp") or "") if x.isdigit())
    if not phone:
        return None
    text = quote(build_whatsapp_message(payload))
    return f"https://wa.me/{phone}?text={text}"


def create_weekly_report(
    *,
    supplier_id: str,
    report_date: date | None = None,
    mark_sent: bool = False,
) -> SupplierWeeklyInventoryReport:
    report_date = report_date or _today()
    payload = build_supplier_weekly_report_data(
        supplier_id=supplier_id,
        report_date=report_date,
    )

    existing = (
        SupplierWeeklyInventoryReport.objects.using(_USING)
        .filter(supplier_id=supplier_id, report_date=report_date)
        .first()
    )
    if existing:
        existing.payload = payload
        existing.week_start = date.fromisoformat(payload["week_start"])
        existing.week_end = date.fromisoformat(payload["week_end"])
        if mark_sent:
            existing.status = SupplierWeeklyInventoryReport.Status.SENT
            existing.whatsapp_sent_at = timezone.now()
        existing.save(using=_USING)
        return existing

    code = catalog_service._next_code("SWR", SupplierWeeklyInventoryReport)
    report = SupplierWeeklyInventoryReport.objects.using(_USING).create(
        code=code,
        supplier_id=supplier_id,
        report_date=report_date,
        week_start=date.fromisoformat(payload["week_start"]),
        week_end=date.fromisoformat(payload["week_end"]),
        status=(
            SupplierWeeklyInventoryReport.Status.SENT
            if mark_sent
            else SupplierWeeklyInventoryReport.Status.GENERATED
        ),
        payload=payload,
        whatsapp_sent_at=timezone.now() if mark_sent else None,
    )
    return report


def serialize_report(report: SupplierWeeklyInventoryReport) -> dict:
    payload = report.payload or {}
    return {
        "id": str(report.id),
        "code": report.code,
        "supplier_id": str(report.supplier_id),
        "supplier_code": payload.get("supplier_code") or report.supplier.code,
        "supplier_name": payload.get("supplier_name") or report.supplier.name_ar,
        "report_date": report.report_date.isoformat(),
        "week_start": report.week_start.isoformat(),
        "week_end": report.week_end.isoformat(),
        "status": report.status,
        "whatsapp_sent_at": (
            report.whatsapp_sent_at.isoformat() if report.whatsapp_sent_at else None
        ),
        "whatsapp_url": whatsapp_url_for_report(payload),
        "payload": payload,
        "created_at": report.created_at.isoformat(),
    }


def run_daily_supplier_inventory(*, report_date: date | None = None) -> dict:
    """فحص يومي — إنشاء كشوف الموردين الذين يوافق يومهم اليوم الحالي."""
    report_date = report_date or _today()
    weekday = report_date.weekday()
    day_keys = [k for k, w in WEEKDAY_FOR_DAY.items() if w == weekday]

    created = 0
    skipped = 0
    errors: list[str] = []

    suppliers = Supplier.objects.using(_USING).filter(
        is_active=True,
        weekly_inventory_day__in=day_keys,
    )

    for supplier in suppliers:
        exists = SupplierWeeklyInventoryReport.objects.using(_USING).filter(
            supplier_id=supplier.id,
            report_date=report_date,
        ).exists()
        if exists:
            skipped += 1
            continue
        try:
            create_weekly_report(supplier_id=str(supplier.id), report_date=report_date)
            created += 1
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{supplier.code}: {exc}")

    return {
        "report_date": report_date.isoformat(),
        "weekday": weekday,
        "created": created,
        "skipped": skipped,
        "errors": errors,
    }
