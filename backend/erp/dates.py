"""توحيد تحليل التواريخ — افتراضي اليوم المحلي عند غياب القيمة في العمليات."""

from __future__ import annotations

from datetime import date

from django.utils import timezone
from rest_framework.exceptions import ValidationError

# تواريخ اختيارية — الفراغ يعني «بدون تاريخ» وليس «اليوم»
NULLABLE_DATE_KEYS = frozenset(
    {
        "end_date",
        "holiday_date",
        "hire_date",
        "from_date",
        "to_date",
        "as_of",
        "week_start",
        "week_end",
        "starts_at",
        "ends_at",
        "offer_starts_at",
        "offer_ends_at",
        "birth_date",
        "due_date",
        "paper_due_date",
        "valid_until",
        "delivery_date",
        "receipt_delivery_date",
        "case_filed_date",
        "legal_case_date",
        "last_payment_date",
        "first_late_due_date",
    }
)


def local_today() -> date:
    return timezone.localdate()


def is_blank(value) -> bool:
    return value is None or value == ""


def parse_optional_date(value) -> date | None:
    if is_blank(value):
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError as exc:
        raise ValidationError(f"تاريخ غير صالح: {value}") from exc


def parse_required_date(value) -> date:
    parsed = parse_optional_date(value)
    return parsed if parsed is not None else local_today()


def normalize_payload_dates(data: dict, *, nullable_keys: frozenset[str] | None = None) -> dict:
    """يملأ حقول *_date الفارغة بتاريخ اليوم قبل الحفظ."""
    nullable = nullable_keys or NULLABLE_DATE_KEYS
    if not isinstance(data, dict):
        return data
    out = dict(data)
    for key, val in out.items():
        if key in nullable:
            continue
        if key == "date" or key.endswith("_date"):
            if is_blank(val):
                out[key] = local_today().isoformat()
    return out
