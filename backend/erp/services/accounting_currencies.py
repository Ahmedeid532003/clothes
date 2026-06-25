"""العملات — أسعار الصرف والتحويل التلقائي."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from rest_framework.exceptions import ValidationError

from erp.accounting_models import Currency

_USING = "tenant"
_QUANT = Decimal("0.01")


def ensure_base_currency() -> Currency:
    row, _ = Currency.objects.using(_USING).get_or_create(
        code="EGP",
        defaults={
            "name_ar": "جنيه مصري",
            "name_en": "Egyptian Pound",
            "symbol": "ج.م",
            "rate_to_base": Decimal("1"),
            "is_base": True,
            "is_active": True,
        },
    )
    if not row.is_base:
        Currency.objects.using(_USING).filter(is_base=True).exclude(pk=row.pk).update(is_base=False)
        row.is_base = True
        row.rate_to_base = Decimal("1")
        row.save(using=_USING, update_fields=["is_base", "rate_to_base"])
    Currency.objects.using(_USING).get_or_create(
        code="USD",
        defaults={
            "name_ar": "دولار أمريكي",
            "name_en": "US Dollar",
            "symbol": "$",
            "rate_to_base": Decimal("50"),
            "is_base": False,
            "is_active": True,
        },
    )
    return row


def _serialize(c: Currency) -> dict:
    return {
        "id": str(c.pk),
        "code": c.code,
        "name_ar": c.name_ar,
        "name_en": c.name_en,
        "symbol": c.symbol,
        "rate_to_base": str(c.rate_to_base),
        "is_base": c.is_base,
        "is_active": c.is_active,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        "display_rate": f"1 {c.code} = {c.rate_to_base} EGP" if not c.is_base else "عملة أساس",
    }


def list_currencies() -> list[dict]:
    ensure_base_currency()
    return [_serialize(c) for c in Currency.objects.using(_USING).filter(is_active=True).order_by("-is_base", "code")]


def get_base_currency() -> Currency:
    return ensure_base_currency()


def convert_to_base(amount: Decimal | str, currency_code: str) -> dict:
    """تحويل مبلغ إلى العملة الأساسية (EGP)."""
    ensure_base_currency()
    amount = Decimal(str(amount))
    code = (currency_code or "EGP").upper()
    if code == "EGP":
        return {
            "original_amount": str(amount),
            "original_currency": "EGP",
            "base_amount": str(amount.quantize(_QUANT, rounding=ROUND_HALF_UP)),
            "base_currency": "EGP",
            "rate": "1",
            "fx_difference": "0",
        }
    try:
        cur = Currency.objects.using(_USING).get(code=code, is_active=True)
    except Currency.DoesNotExist:
        raise ValidationError(f"العملة {code} غير معرّفة.")
    base_amount = (amount * cur.rate_to_base).quantize(_QUANT, rounding=ROUND_HALF_UP)
    return {
        "original_amount": str(amount),
        "original_currency": code,
        "base_amount": str(base_amount),
        "base_currency": "EGP",
        "rate": str(cur.rate_to_base),
        "fx_difference": "0",
    }


def convert_from_base(amount_egp: Decimal | str, currency_code: str) -> Decimal:
    amount_egp = Decimal(str(amount_egp))
    code = (currency_code or "EGP").upper()
    if code == "EGP":
        return amount_egp
    cur = Currency.objects.using(_USING).get(code=code, is_active=True)
    if cur.rate_to_base <= 0:
        raise ValidationError("سعر الصرف غير صالح.")
    return (amount_egp / cur.rate_to_base).quantize(_QUANT, rounding=ROUND_HALF_UP)


@transaction.atomic(using=_USING)
def create_currency(*, data: dict) -> Currency:
    code = (data.get("code") or "").upper().strip()[:3]
    if len(code) != 3:
        raise ValidationError("كود العملة 3 أحرف (مثل USD).")
    if Currency.objects.using(_USING).filter(code=code).exists():
        raise ValidationError("العملة موجودة.")
    rate = Decimal(str(data.get("rate_to_base") or 1))
    if rate <= 0:
        raise ValidationError("سعر الصرف يجب أن يكون أكبر من صفر.")
    is_base = bool(data.get("is_base"))
    if is_base:
        Currency.objects.using(_USING).update(is_base=False)
        rate = Decimal("1")
    return Currency.objects.using(_USING).create(
        code=code,
        name_ar=(data.get("name_ar") or "").strip() or code,
        name_en=(data.get("name_en") or "").strip(),
        symbol=(data.get("symbol") or "").strip() or code,
        rate_to_base=rate,
        is_base=is_base,
        is_active=True,
    )


@transaction.atomic(using=_USING)
def update_currency(row: Currency, *, data: dict) -> Currency:
    if row.is_base:
        row.rate_to_base = Decimal("1")
    elif "rate_to_base" in data:
        rate = Decimal(str(data["rate_to_base"]))
        if rate <= 0:
            raise ValidationError("سعر الصرف غير صالح.")
        row.rate_to_base = rate
    for f in ("name_ar", "name_en", "symbol"):
        if f in data:
            setattr(row, f, (data[f] or "").strip())
    row.save(using=_USING)
    return row
