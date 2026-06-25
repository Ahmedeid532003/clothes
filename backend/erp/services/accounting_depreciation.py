"""إهلاك الأصول — قسط ثابت ومتناقص."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.accounting_models import DepreciationEntry, FixedAsset, JournalEntry, JournalLine
from erp.services import catalog as catalog_service
from erp.services.accounting_chart import ensure_default_chart

_USING = "tenant"
_QUANT = Decimal("0.01")


def _monthly_amount(asset: FixedAsset) -> Decimal:
    book = asset.cost - asset.accumulated_depreciation
    if book <= 0:
        return Decimal("0")
    if asset.depreciation_method == FixedAsset.DepreciationMethod.STRAIGHT_LINE:
        return (asset.cost / asset.useful_life_months).quantize(_QUANT, rounding=ROUND_HALF_UP)
    rate = asset.depreciation_rate / Decimal("100")
    if rate <= 0:
        rate = Decimal("0.25")
    monthly = (book * rate / Decimal("12")).quantize(_QUANT, rounding=ROUND_HALF_UP)
    return min(monthly, book)


def _serialize_asset(a: FixedAsset) -> dict:
    monthly = _monthly_amount(a)
    return {
        "id": str(a.pk),
        "code": a.code,
        "name_ar": a.name_ar,
        "name_en": a.name_en,
        "category": a.category,
        "acquisition_date": a.acquisition_date.isoformat(),
        "cost": str(a.cost),
        "currency": a.currency.code if a.currency_id else "EGP",
        "useful_life_months": a.useful_life_months,
        "depreciation_method": a.depreciation_method,
        "depreciation_rate": str(a.depreciation_rate),
        "accumulated_depreciation": str(a.accumulated_depreciation),
        "book_value": str(a.book_value),
        "monthly_depreciation": str(monthly),
        "gl_asset_code": a.gl_asset.code if a.gl_asset else "",
        "gl_accumulated_code": a.gl_accumulated.code if a.gl_accumulated else "",
        "gl_expense_code": a.gl_expense.code if a.gl_expense else "",
        "status": a.status,
        "notes": a.notes,
    }


def list_fixed_assets() -> list[dict]:
    ensure_default_chart()
    return [
        _serialize_asset(a)
        for a in FixedAsset.objects.using(_USING)
        .select_related("gl_asset", "gl_accumulated", "gl_expense", "currency")
        .order_by("code")
    ]


def list_depreciation_entries(asset_id=None) -> list[dict]:
    qs = DepreciationEntry.objects.using(_USING).select_related("asset", "journal_entry").order_by(
        "-period"
    )[:200]
    if asset_id:
        qs = qs.filter(asset_id=asset_id)
    return [
        {
            "id": str(e.pk),
            "code": e.code,
            "asset": str(e.asset_id),
            "asset_code": e.asset.code,
            "asset_name": e.asset.name_ar,
            "period": e.period,
            "amount": str(e.amount),
            "journal_code": e.journal_entry.code if e.journal_entry else None,
            "posted_at": e.posted_at.isoformat() if e.posted_at else None,
        }
        for e in qs
    ]


@transaction.atomic(using=_USING)
def create_fixed_asset(*, data: dict, user) -> FixedAsset:
    from erp.accounting_models import GlAccount

    ensure_default_chart()
    cost = Decimal(str(data["cost"]))
    if cost <= 0:
        raise ValidationError("قيمة الأصل يجب أن تكون أكبر من صفر.")
    months = int(data.get("useful_life_months") or 36)
    if months < 1:
        raise ValidationError("العمر الافتراضي غير صالح.")

    gl_asset = GlAccount.objects.using(_USING).get(pk=data["gl_asset"])
    gl_accum = GlAccount.objects.using(_USING).get(pk=data["gl_accumulated"])
    gl_exp = GlAccount.objects.using(_USING).get(pk=data["gl_expense"])

    code = catalog_service._next_code("FA", FixedAsset)
    asset = FixedAsset.objects.using(_USING).create(
        code=code,
        name_ar=(data.get("name_ar") or "").strip(),
        name_en=(data.get("name_en") or "").strip(),
        category=data.get("category", FixedAsset.Category.DEVICE),
        acquisition_date=data["acquisition_date"],
        cost=cost,
        currency_id=data.get("currency") or None,
        useful_life_months=months,
        depreciation_method=data.get(
            "depreciation_method", FixedAsset.DepreciationMethod.STRAIGHT_LINE
        ),
        depreciation_rate=Decimal(str(data.get("depreciation_rate") or 0)),
        gl_asset=gl_asset,
        gl_accumulated=gl_accum,
        gl_expense=gl_exp,
        branch_id=data.get("branch") or None,
        cost_center_id=data.get("cost_center") or None,
        notes=(data.get("notes") or "").strip(),
        status=FixedAsset.Status.ACTIVE,
    )
    return asset


@transaction.atomic(using=_USING)
def run_depreciation(*, asset_id, period: str, user) -> DepreciationEntry:
    if not re_match_period(period):
        raise ValidationError("الفترة بصيغة YYYY-MM.")
    asset = (
        FixedAsset.objects.using(_USING)
        .select_for_update()
        .select_related("gl_asset", "gl_accumulated", "gl_expense")
        .get(pk=asset_id)
    )
    if asset.status != FixedAsset.Status.ACTIVE:
        raise ValidationError("الأصل غير نشط.")
    if DepreciationEntry.objects.using(_USING).filter(asset=asset, period=period).exists():
        raise ValidationError("تم إهلاك هذه الفترة مسبقاً.")

    amount = _monthly_amount(asset)
    if amount <= 0:
        raise ValidationError("لا يوجد إهلاك متبقٍ.")

    je_code = catalog_service._next_code("JE", JournalEntry)
    journal = JournalEntry.objects.using(_USING).create(
        code=je_code,
        entry_date=timezone.now().date(),
        description=f"إهلاك {asset.name_ar} — {period}",
        status=JournalEntry.Status.POSTED,
        entry_kind=JournalEntry.EntryKind.SYSTEM,
        source_type="depreciation",
        source_id=asset.pk,
        total_debit=amount,
        total_credit=amount,
        posted_at=timezone.now(),
        approved_by=user,
        approved_at=timezone.now(),
        created_by=user,
    )
    JournalLine.objects.using(_USING).create(
        journal=journal,
        gl_account=asset.gl_expense,
        debit=amount,
        credit=Decimal("0"),
        line_order=1,
        memo=f"مصروف إهلاك — {asset.code}",
    )
    JournalLine.objects.using(_USING).create(
        journal=journal,
        gl_account=asset.gl_accumulated,
        debit=Decimal("0"),
        credit=amount,
        line_order=2,
        memo=f"مجمع إهلاك — {asset.code}",
    )

    asset.accumulated_depreciation += amount
    if asset.accumulated_depreciation >= asset.cost:
        asset.accumulated_depreciation = asset.cost
        asset.status = FixedAsset.Status.FULLY_DEPRECIATED
    asset.save(using=_USING, update_fields=["accumulated_depreciation", "status"])

    entry_code = catalog_service._next_code("DEP", DepreciationEntry)
    entry = DepreciationEntry.objects.using(_USING).create(
        code=entry_code,
        asset=asset,
        period=period,
        amount=amount,
        journal_entry=journal,
        created_by=user,
    )
    return entry


def re_match_period(period: str) -> bool:
    import re

    return bool(re.match(r"^\d{4}-\d{2}$", period or ""))


@transaction.atomic(using=_USING)
def run_bulk_depreciation(*, period: str, user) -> list[dict]:
    results = []
    for asset in FixedAsset.objects.using(_USING).filter(status=FixedAsset.Status.ACTIVE):
        try:
            entry = run_depreciation(asset_id=asset.pk, period=period, user=user)
            results.append({"asset": asset.code, "ok": True, "amount": str(entry.amount)})
        except ValidationError as exc:
            results.append({"asset": asset.code, "ok": False, "error": str(exc.detail)})
    return results
