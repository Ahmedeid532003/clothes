"""متابع الأقساط — فلترة متقدمة، تحديث جماعي، غرامات، رسائل، رقم ليسته."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from django.db.models import Q
from rest_framework.exceptions import ValidationError

from erp.customer_models import Customer, CustomerGroup
from erp.models import Branch
from erp.receivable_models import CustomerReminder, InstallmentLine
from erp.sale_models import Sale
from erp.services import customers as customer_service
from erp.services.pos_customers import _installment_stats, resolve_collection_tier
from erp.services.receivables import (
    _customer_ar_summary,
    _days_overdue,
    _effective_due_date,
    queue_reminder,
)
from erp.services.customers import log_customer_activity

_USING = "tenant"
_QUANT = Decimal("0.01")


def _param(params, key: str, default=""):
    """قراءة آمنة لمعاملات QueryDict أو dict."""
    if params is None:
        return default
    get = getattr(params, "get", None)
    if not get:
        return default
    val = get(key, default)
    if isinstance(val, list):
        val = val[-1] if val else default
    if val is None:
        return default
    return val


def _parse_date(value) -> date | None:
    if not value:
        return None
    if isinstance(value, list):
        value = value[-1] if value else None
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def _profile_date(profile: dict, key: str) -> date | None:
    raw = profile.get(key)
    if not raw:
        return None
    if isinstance(raw, date):
        return raw
    return _parse_date(str(raw))


def _followup_installment_detail(customer_id) -> dict:
    lines = (
        InstallmentLine.objects.using(_USING)
        .select_related("contract", "contract__sale", "contract__sale__branch")
        .filter(contract__customer_id=customer_id)
        .exclude(status=InstallmentLine.Status.CANCELLED)
    )
    late_lines: list[InstallmentLine] = []
    due_lines: list[InstallmentLine] = []
    last_paid: datetime | None = None
    branch_id = ""
    branch_name = ""
    for ln in lines:
        if ln.status == InstallmentLine.Status.PAID:
            if ln.paid_at and (last_paid is None or ln.paid_at > last_paid):
                last_paid = ln.paid_at
            continue
        effective_due = _effective_due_date(ln)
        days = _days_overdue(effective_due)
        if days > 0 or ln.status == InstallmentLine.Status.LATE:
            late_lines.append(ln)
        elif ln.status in (InstallmentLine.Status.DUE, InstallmentLine.Status.SCHEDULED):
            due_lines.append(ln)
        sale = getattr(ln.contract, "sale", None)
        if sale and sale.branch_id and not branch_id:
            branch_id = str(sale.branch_id)
            branch_name = sale.branch.name_ar

    if not branch_id:
        last_sale = (
            Sale.objects.using(_USING)
            .filter(customer_id=customer_id)
            .select_related("branch")
            .order_by("-created_at")
            .first()
        )
        if last_sale:
            branch_id = str(last_sale.branch_id)
            branch_name = last_sale.branch.name_ar

    late_value = sum((ln.balance for ln in late_lines), Decimal("0"))
    due_value = sum((ln.balance for ln in due_lines), Decimal("0"))
    first_late = min((_effective_due_date(ln) for ln in late_lines), default=None)
    max_days = max((_days_overdue(_effective_due_date(ln)) for ln in late_lines), default=0)
    late_months = max_days // 30 if max_days else 0

    penalty_type = ""
    penalty_value = Decimal("0")
    if late_lines:
        penalty_type = late_lines[0].notes or ""
        penalty_value = late_lines[0].penalty_amount or Decimal("0")

    return {
        "late_installment_count": len(late_lines),
        "late_installment_value": str(late_value.quantize(_QUANT)),
        "due_installment_count": len(due_lines),
        "due_installment_value": str(due_value.quantize(_QUANT)),
        "first_late_due_date": first_late.isoformat() if first_late else None,
        "late_months": late_months,
        "max_days_overdue": max_days,
        "last_payment_date": last_paid.date().isoformat() if last_paid else None,
        "branch_id": branch_id,
        "branch_name": branch_name,
        "penalty_type": penalty_type,
        "penalty_value": str(penalty_value.quantize(_QUANT)),
    }


def _serialize_followup_row(customer: Customer) -> dict:
    profile = customer.profile_data or {}
    ar = _customer_ar_summary(customer)
    inst = _installment_stats(customer.pk)
    detail = _followup_installment_detail(customer.pk)
    tier = resolve_collection_tier(customer, ar=ar, inst=inst)
    base = customer_service._serialize_customer(customer)
    group = customer.customer_group
    region = (group.region if group else "") or customer.governorate or customer.city or ""
    spouse = customer_service.profile_spouse(profile)
    guarantor = customer_service.profile_guarantor_summary(profile)
    sms_ok = bool(profile.get("sms_enabled", True) and (customer.phone or "").strip())
    wa_ok = bool(profile.get("whatsapp_enabled", True) and (customer.whatsapp or customer.phone or "").strip())
    return {
        **base,
        **tier,
        **detail,
        "spouse_name": spouse,
        "guarantor_summary": guarantor,
        "guarantor_name": guarantor,
        "kinship": str(profile.get("kinship") or profile.get("relation") or ""),
        "region": region,
        "group_region": group.region if group else "",
        "compliance_percent": ar.get("compliance_percent"),
        "overdue_total": ar.get("overdue_total"),
        "open_installment_balance": inst.get("open_installment_balance"),
        "list_number": str(profile.get("list_number") or ""),
        "lawyer_name": str(profile.get("lawyer_name") or ""),
        "receipt_delivery_date": str(profile.get("receipt_delivery_date") or ""),
        "case_filed_date": str(profile.get("case_filed_date") or profile.get("legal_case_date") or ""),
        "late_penalty_type": str(profile.get("late_penalty_type") or detail.get("penalty_type") or ""),
        "late_penalty_value": str(profile.get("late_penalty_value") or detail.get("penalty_value") or "0"),
        "sms_enabled": sms_ok,
        "whatsapp_enabled": wa_ok,
        "balance_due": str((customer.balance_due or Decimal("0")).quantize(_QUANT)),
    }


def _match_compare(value: Decimal, target: Decimal, op: str) -> bool:
    if op == "lte":
        return value <= target
    if op == "lt":
        return value < target
    if op == "gte":
        return value >= target
    if op == "gt":
        return value > target
    return value >= target


def list_installment_followup(*, params) -> dict:
    branch_ids = [x.strip() for x in str(_param(params, "branches")).split(",") if x.strip()]
    group_ids = [x.strip() for x in str(_param(params, "groups")).split(",") if x.strip()]
    q = str(_param(params, "q")).strip().lower()
    list_number = str(_param(params, "list_number")).strip()
    lawyer_name = str(_param(params, "lawyer_name")).strip().lower()
    region = str(_param(params, "region")).strip().lower()
    late_count_min = int(_param(params, "late_count_min") or 0)
    late_count_op = str(_param(params, "late_count_op") or "gte").strip()
    late_value = Decimal(str(_param(params, "late_value") or 0))
    late_value_op = str(_param(params, "late_value_op") or "gte").strip()
    balance_value = Decimal(str(_param(params, "balance_value") or 0))
    balance_op = str(_param(params, "balance_op") or "gte").strip()
    late_months_min = int(_param(params, "late_months_min") or 0)
    only_late = str(_param(params, "only_late")).lower() in ("1", "true", "yes")
    case_from = _parse_date(_param(params, "case_from"))
    case_to = _parse_date(_param(params, "case_to"))
    receipt_from = _parse_date(_param(params, "receipt_from"))
    receipt_to = _parse_date(_param(params, "receipt_to"))
    payment_from = _parse_date(_param(params, "payment_from"))
    payment_to = _parse_date(_param(params, "payment_to"))
    period_from = _parse_date(_param(params, "period_from"))
    period_to = _parse_date(_param(params, "period_to"))

    qs = (
        Customer.objects.using(_USING)
        .select_related("customer_type", "customer_group", "assigned_salesperson")
        .filter(is_active=True)
        .order_by("code")
    )
    if group_ids:
        qs = qs.filter(customer_group_id__in=group_ids)

    rows: list[dict] = []
    for c in qs:
        profile = c.profile_data or {}
        if list_number and str(profile.get("list_number") or "") != list_number:
            continue
        if lawyer_name and lawyer_name not in str(profile.get("lawyer_name") or "").lower():
            continue
        row = _serialize_followup_row(c)
        if region and region not in (row.get("region") or "").lower() and region not in (
            row.get("group_region") or ""
        ).lower():
            continue
        if branch_ids and row.get("branch_id") and row["branch_id"] not in branch_ids:
            continue
        if only_late and int(row.get("late_installment_count") or 0) <= 0:
            continue
        late_cnt = int(row.get("late_installment_count") or 0)
        if late_count_min > 0 and not _match_compare(Decimal(late_cnt), Decimal(late_count_min), late_count_op):
            continue
        late_val = Decimal(str(row.get("late_installment_value") or 0))
        if late_value > 0 and not _match_compare(late_val, late_value, late_value_op):
            continue
        bal = Decimal(str(row.get("balance_due") or 0))
        if balance_value > 0 and not _match_compare(bal, balance_value, balance_op):
            continue
        if late_months_min > 0 and int(row.get("late_months") or 0) < late_months_min:
            continue
        cd = _profile_date(profile, "case_filed_date") or _profile_date(profile, "legal_case_date")
        if case_from and (not cd or cd < case_from):
            continue
        if case_to and (not cd or cd > case_to):
            continue
        rd = _profile_date(profile, "receipt_delivery_date")
        if receipt_from and (not rd or rd < receipt_from):
            continue
        if receipt_to and (not rd or rd > receipt_to):
            continue
        lp = _parse_date(row.get("last_payment_date"))
        if payment_from and (not lp or lp < payment_from):
            continue
        if payment_to and (not lp or lp > payment_to):
            continue
        if period_from or period_to:
            fld = _parse_date(row.get("first_late_due_date"))
            if period_from and (not fld or fld < period_from):
                continue
            if period_to and (not fld or fld > period_to):
                continue
        if q:
            hay = customer_service.profile_search_haystack(c, profile)
            hay = " ".join(
                [
                    hay,
                    row.get("lawyer_name") or "",
                    row.get("list_number") or "",
                    (c.customer_group.name_ar if c.customer_group else ""),
                    row.get("branch_name") or "",
                ]
            ).lower()
            if not all(w in hay for w in q.split()):
                continue
        rows.append(row)

    total_late = sum(
        (Decimal(r.get("late_installment_value") or 0) for r in rows),
        Decimal("0"),
    )
    total_balance = sum(
        (Decimal(r.get("balance_due") or 0) for r in rows),
        Decimal("0"),
    )
    return {
        "count": len(rows),
        "summary": {
            "total_late_value": str(total_late.quantize(_QUANT)),
            "total_balance": str(total_balance.quantize(_QUANT)),
        },
        "rows": rows[:1000],
    }


def _describe_filters(filters: dict) -> str:
    """ملخص عربي مختصر للفلاتر المحفوظة."""
    if not filters:
        return "كل العملاء"
    parts: list[str] = []
    if str(filters.get("only_late", "")).lower() in ("1", "true", "yes"):
        parts.append("متأخرين فقط")
    if filters.get("q"):
        parts.append(f"بحث: {filters['q']}")
    if filters.get("list_number"):
        parts.append(f"ليسته: {filters['list_number']}")
    if filters.get("lawyer_name"):
        parts.append(f"محامي: {filters['lawyer_name']}")
    if filters.get("region"):
        parts.append(f"منطقة: {filters['region']}")
    if filters.get("branches"):
        parts.append("فروع محددة")
    if filters.get("groups"):
        parts.append("مجموعات محددة")
    if filters.get("late_count_min"):
        op = "≥" if filters.get("late_count_op", "gte") == "gte" else "≤"
        parts.append(f"عدد متأخر {op}{filters['late_count_min']}")
    if filters.get("late_value"):
        op = "≥" if filters.get("late_value_op", "gte") == "gte" else "≤"
        parts.append(f"قيمة متأخر {op}{filters['late_value']}")
    if filters.get("balance_value"):
        op = "≥" if filters.get("balance_op", "gte") == "gte" else "≤"
        parts.append(f"رصيد {op}{filters['balance_value']}")
    if filters.get("late_months_min"):
        parts.append(f"تأخير ≥{filters['late_months_min']} شهر")
    if filters.get("case_from") or filters.get("case_to"):
        parts.append("تاريخ رفع قضية")
    if filters.get("receipt_from") or filters.get("receipt_to"):
        parts.append("تاريخ تسليم إيصال")
    return " · ".join(parts) if parts else "فلاتر مخصصة"


def _serialize_saved_list(row: InstallmentFollowUpSavedList) -> dict:
    return {
        "id": str(row.pk),
        "list_number": row.list_number,
        "filter_snapshot": row.filter_snapshot or {},
        "filter_summary": row.filter_summary or _describe_filters(row.filter_snapshot or {}),
        "customer_count": row.customer_count,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def save_followup_list_snapshot(
    *,
    list_number: str,
    filters: dict,
    customer_count: int,
    user,
) -> dict:
    num = (list_number or "").strip()
    if not num:
        raise ValidationError("رقم الليسته مطلوب.")
    summary = _describe_filters(filters)
    snap = {k: v for k, v in (filters or {}).items() if v is not None and v != ""}
    snap["list_number"] = num
    obj, _created = InstallmentFollowUpSavedList.objects.using(_USING).update_or_create(
        list_number=num,
        defaults={
            "filter_snapshot": snap,
            "filter_summary": summary,
            "customer_count": customer_count,
            "created_by_id": getattr(user, "pk", None),
        },
    )
    return _serialize_saved_list(obj)


def list_saved_followup_lists() -> list[dict]:
    rows = InstallmentFollowUpSavedList.objects.using(_USING).order_by("-updated_at")[:100]
    return [_serialize_saved_list(r) for r in rows]


def get_saved_followup_list(list_number: str) -> dict | None:
    num = (list_number or "").strip()
    if not num:
        return None
    row = InstallmentFollowUpSavedList.objects.using(_USING).filter(list_number=num).first()
    return _serialize_saved_list(row) if row else None

def bulk_update_followup_customers(*, customer_ids: list, patch: dict, user) -> dict:
    if not customer_ids:
        raise ValidationError("حدد عملاء للتعديل.")
    updated = 0
    group_id = patch.get("customer_group")
    profile_patch = dict(patch.get("profile_data") or {})
    for key in ("list_number", "lawyer_name", "receipt_delivery_date", "case_filed_date", "collection_tier"):
        if key in patch and patch[key] is not None:
            profile_patch[key] = patch[key]
    for cid in customer_ids:
        c = Customer.objects.using(_USING).select_related("customer_group").get(pk=cid)
        data: dict = {}
        if group_id:
            data["customer_group"] = group_id
        if profile_patch:
            merged = dict(c.profile_data or {})
            merged.update({k: v for k, v in profile_patch.items() if v is not None})
            data["profile_data"] = merged
        if data:
            customer_service.update_customer(c.pk, data=data, user=user)
            updated += 1
    return {"updated": updated}


def assign_list_number(
    *,
    customer_ids: list,
    list_number: str,
    user,
    filters: dict | None = None,
) -> dict:
    num = (list_number or "").strip()
    if not num:
        raise ValidationError("رقم الليسته مطلوب.")
    result = bulk_update_followup_customers(
        customer_ids=customer_ids,
        patch={"list_number": num},
        user=user,
    )
    if filters is not None:
        snap = dict(filters)
        snap["list_number"] = num
        saved = save_followup_list_snapshot(
            list_number=num,
            filters=snap,
            customer_count=len(customer_ids),
            user=user,
        )
        result["saved_list"] = saved
    return result


def apply_late_penalties(
    *,
    customer_ids: list,
    penalty_type: str,
    penalty_value: Decimal,
    user,
) -> dict:
    if not customer_ids:
        raise ValidationError("حدد عملاء لتطبيق الغرامة.")
    if penalty_value <= 0:
        raise ValidationError("قيمة الغرامة يجب أن تكون أكبر من صفر.")
    ptype = (penalty_type or "fixed").strip().lower()
    if ptype not in ("fixed", "percent"):
        raise ValidationError("نوع الغرامة: fixed أو percent")
    affected_lines = 0
    for cid in customer_ids:
        lines = (
            InstallmentLine.objects.using(_USING)
            .select_related("contract")
            .filter(contract__customer_id=cid)
            .exclude(status__in=[InstallmentLine.Status.PAID, InstallmentLine.Status.CANCELLED])
        )
        for ln in lines:
            if _days_overdue(_effective_due_date(ln)) <= 0 and ln.status != InstallmentLine.Status.LATE:
                continue
            if ptype == "percent":
                ln.penalty_amount = (ln.balance * penalty_value / Decimal("100")).quantize(_QUANT)
            else:
                ln.penalty_amount = penalty_value.quantize(_QUANT)
            ln.save(using=_USING, update_fields=["penalty_amount"])
            affected_lines += 1
        c = Customer.objects.using(_USING).get(pk=cid)
        profile = dict(c.profile_data or {})
        profile["late_penalty_type"] = ptype
        profile["late_penalty_value"] = str(penalty_value)
        c.profile_data = profile
        c.save(using=_USING, update_fields=["profile_data"])
        log_customer_activity(cid, "penalty_applied", f"غرامة {ptype} {penalty_value}", user)
    return {"customers": len(customer_ids), "lines_updated": affected_lines}


def bulk_queue_reminders(*, customer_ids: list, channel: str, message: str, user) -> dict:
    if not customer_ids:
        raise ValidationError("حدد عملاء للإرسال.")
    ch = (channel or CustomerReminder.Channel.WHATSAPP).strip().lower()
    sent = []
    skipped = []
    for cid in customer_ids:
        c = Customer.objects.using(_USING).get(pk=cid)
        profile = c.profile_data or {}
        if ch == CustomerReminder.Channel.WHATSAPP:
            if not profile.get("whatsapp_enabled", True) or not (c.whatsapp or c.phone):
                skipped.append({"id": str(cid), "reason": "no_whatsapp"})
                continue
        elif ch == CustomerReminder.Channel.SMS:
            if not profile.get("sms_enabled", True) or not c.phone:
                skipped.append({"id": str(cid), "reason": "no_sms"})
                continue
        row = queue_reminder(
            {"customer": cid, "channel": ch, "message": message or None},
            user,
        )
        sent.append(row)
    return {"sent": sent, "skipped": skipped, "sent_count": len(sent)}


def followup_filter_options() -> dict:
    branches = list(
        Branch.objects.using(_USING).filter(is_active=True).values("id", "code", "name_ar")
    )
    groups = list(
        CustomerGroup.objects.using(_USING)
        .filter(is_active=True)
        .order_by("tree_path")
        .values("id", "code", "name_ar", "region", "display_color")
    )
    regions = sorted({g["region"] for g in groups if g.get("region")})
    list_numbers = sorted(
        {
            str((c.profile_data or {}).get("list_number"))
            for c in Customer.objects.using(_USING).only("profile_data")
            if (c.profile_data or {}).get("list_number")
        }
    )
    saved_lists = list_saved_followup_lists()
    return {
        "branches": [{**b, "id": str(b["id"])} for b in branches],
        "groups": [{**g, "id": str(g["id"])} for g in groups],
        "regions": regions,
        "list_numbers": list_numbers,
        "saved_lists": saved_lists,
    }
