"""خدمات الرواتب والحضور."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from rest_framework.exceptions import ValidationError

from erp.dates import parse_optional_date, parse_required_date
from erp.hr_payroll_models import (
    AllowanceItem,
    AttendanceImportBatch,
    AttendanceRecord,
    BonusItem,
    DeductionItem,
    EmployeeAdvance,
    EmployeeAdvanceInstallment,
    EmployeeAllowanceAssignment,
    EmployeeBonus,
    EmployeeCommissionRecord,
    EmployeeDeduction,
    EmployeeLeave,
    LeaveType,
    OfficialHoliday,
    PayrollPayment,
    PayrollPaymentType,
    PayrollPeriodLock,
    PayrollStatement,
)
from erp.hr_structure_models import EmployeeProfile, EmployeeSalaryIncrease, WorkShift
from erp.models import Branch, User
from erp.services.hr_employee_data import _dec, _pay_totals

_USING = "tenant"
_QUANT = Decimal("0.01")
_WEEKDAY_MAP = {
    0: "monday",
    1: "tuesday",
    2: "wednesday",
    3: "thursday",
    4: "friday",
    5: "saturday",
    6: "sunday",
}


def _next_code(prefix: str, model, field: str = "code") -> str:
    existing = (
        model.objects.using(_USING)
        .filter(**{f"{field}__startswith": prefix})
        .order_by(f"-{field}")
        .values_list(field, flat=True)
        .first()
    )
    n = 1
    if existing:
        try:
            n = int(str(existing).split("-")[-1]) + 1
        except ValueError:
            n = model.objects.using(_USING).count() + 1
    return f"{prefix}-{n:02d}"


def _catalog_row(obj) -> dict:
    row = {
        "id": str(obj.pk),
        "code": obj.code,
        "name": obj.name,
        "is_active": obj.is_active,
    }
    if hasattr(obj, "default_amount"):
        row["default_amount"] = str(obj.default_amount)
    return row


# --- Catalog CRUD (generic) ---


def list_catalog(model) -> list[dict]:
    return [_catalog_row(x) for x in model.objects.using(_USING).filter(is_active=True)]


@transaction.atomic(using="tenant")
def create_catalog(
    model,
    *,
    name: str,
    code: str | None = None,
    prefix: str = "X",
    default_amount=None,
) -> dict:
    name = name.strip()
    if not name:
        raise ValidationError("الاسم مطلوب.")
    final = (code or _next_code(prefix, model)).strip().upper()
    if model.objects.using(_USING).filter(code=final).exists():
        raise ValidationError(f"الكود '{final}' مستخدم.")
    payload = {"code": final, "name": name}
    if default_amount is not None and hasattr(model, "default_amount"):
        payload["default_amount"] = _dec(default_amount)
    obj = model.objects.using(_USING).create(**payload)
    return _catalog_row(obj)


@transaction.atomic(using="tenant")
def update_catalog(model, pk, *, name: str, default_amount=None) -> dict:
    obj = model.objects.using(_USING).get(pk=pk, is_active=True)
    obj.name = name.strip()
    if not obj.name:
        raise ValidationError("الاسم مطلوب.")
    if default_amount is not None and hasattr(obj, "default_amount"):
        obj.default_amount = _dec(default_amount)
        obj.save(using=_USING)
    else:
        obj.save(using=_USING)
    return _catalog_row(obj)


@transaction.atomic(using="tenant")
def deactivate_catalog(model, pk) -> None:
    obj = model.objects.using(_USING).get(pk=pk)
    obj.is_active = False
    obj.save(using=_USING, update_fields=["is_active"])


# --- Official holidays ---


def list_official_holidays() -> list[dict]:
    return [
        {
            "id": str(h.pk),
            "name": h.name,
            "holiday_date": h.holiday_date.isoformat() if h.holiday_date else None,
            "is_recurring": h.is_recurring,
            "notes": h.notes,
            "is_active": h.is_active,
        }
        for h in OfficialHoliday.objects.using(_USING).filter(is_active=True)
    ]


@transaction.atomic(using="tenant")
def create_official_holiday(*, name: str, holiday_date: str | None = None, is_recurring: bool = False, notes: str = "") -> dict:
    parsed = date.fromisoformat(holiday_date) if holiday_date else None
    h = OfficialHoliday.objects.using(_USING).create(
        name=name.strip(),
        holiday_date=parsed,
        is_recurring=is_recurring,
        notes=notes.strip(),
    )
    return {
        "id": str(h.pk),
        "name": h.name,
        "holiday_date": h.holiday_date.isoformat() if h.holiday_date else None,
        "is_recurring": h.is_recurring,
        "notes": h.notes,
        "is_active": True,
    }


@transaction.atomic(using="tenant")
def update_official_holiday(pk, data: dict) -> dict:
    h = OfficialHoliday.objects.using(_USING).get(pk=pk, is_active=True)
    if "name" in data:
        h.name = (data["name"] or "").strip()
    if "holiday_date" in data:
        raw = data["holiday_date"]
        h.holiday_date = date.fromisoformat(raw) if raw else None
    if "is_recurring" in data:
        h.is_recurring = bool(data["is_recurring"])
    if "notes" in data:
        h.notes = (data["notes"] or "").strip()
    h.save(using=_USING)
    return list_official_holidays()[0] if False else {
        "id": str(h.pk),
        "name": h.name,
        "holiday_date": h.holiday_date.isoformat() if h.holiday_date else None,
        "is_recurring": h.is_recurring,
        "notes": h.notes,
        "is_active": h.is_active,
    }


@transaction.atomic(using="tenant")
def deactivate_official_holiday(pk) -> None:
    OfficialHoliday.objects.using(_USING).filter(pk=pk).update(is_active=False)


# --- Employee transactions ---


def _emp_brief(u: User) -> dict:
    return {
        "employee_id": str(u.pk),
        "employee_code": u.employee_code or "",
        "employee_name": u.full_name or u.username,
    }


def _branch_stamp(branch) -> dict:
    if not branch:
        return {"branch_id": None, "branch_name": None}
    name = branch.name_ar or branch.name_en or branch.code
    return {"branch_id": str(branch.pk), "branch_name": name}


def _actor_stamp(actor) -> dict:
    if not actor:
        return {"created_by_id": None, "created_by_name": None}
    return {
        "created_by_id": str(actor.pk),
        "created_by_name": actor.full_name or actor.username,
    }


def _period_index(year: int, month: int) -> int:
    return year * 12 + month


def _allowed_period_window(today: date | None = None) -> tuple[int, int]:
    today = today or date.today()
    current = _period_index(today.year, today.month)
    if today.month == 12:
        nxt = _period_index(today.year + 1, 1)
    else:
        nxt = _period_index(today.year, today.month + 1)
    return current, nxt


def assert_pay_period_allowed(year: int | None, month: int | None) -> None:
    if not year or not month:
        return
    current, nxt = _allowed_period_window()
    p = _period_index(int(year), int(month))
    if p < current or p > nxt:
        raise ValidationError("يسمح بالصرف للشهر الحالي أو الشهر القادم فقط.")
    if PayrollPeriodLock.objects.using(_USING).filter(period_year=year, period_month=month).exists():
        raise ValidationError("شهر الصرف مقفول ولا يمكن تسجيل حركات جديدة عليه.")


def _advance_installment_due(user: User, year: int, month: int) -> Decimal:
    total = (
        EmployeeAdvanceInstallment.objects.using(_USING)
        .filter(
            advance__employee=user,
            advance__is_active=True,
            advance__is_scheduled=True,
            period_year=year,
            period_month=month,
            status=EmployeeAdvanceInstallment.Status.PENDING,
        )
        .aggregate(s=Sum("amount"))["s"]
        or 0
    )
    return _dec(total)


def _unscheduled_advances_due(user: User) -> Decimal:
    total = Decimal("0")
    for adv in EmployeeAdvance.objects.using(_USING).filter(
        employee=user, is_active=True, is_scheduled=False
    ):
        bal = _dec(adv.amount) - _dec(adv.settled_amount)
        if bal > 0:
            total += bal
    return total.quantize(_QUANT)


def _add_months(year: int, month: int, offset: int) -> tuple[int, int]:
    idx = year * 12 + (month - 1) + offset
    return idx // 12, (idx % 12) + 1


def _create_advance_installments(
    advance: EmployeeAdvance,
    *,
    start_year: int,
    start_month: int,
    months: int,
    monthly: Decimal,
) -> None:
    for i in range(months):
        y, m = _add_months(start_year, start_month, i)
        if PayrollPeriodLock.objects.using(_USING).filter(period_year=y, period_month=m).exists():
            raise ValidationError(f"شهر {y}-{m:02d} مقفول ولا يمكن جدولة قسط عليه.")
        EmployeeAdvanceInstallment.objects.using(_USING).create(
            advance=advance,
            period_year=y,
            period_month=m,
            amount=monthly,
        )


def list_bonuses(*, year: int | None = None, month: int | None = None) -> list[dict]:
    qs = EmployeeBonus.objects.using(_USING).select_related("employee", "bonus_item")
    if year and month:
        qs = qs.filter(bonus_date__year=year, bonus_date__month=month)
    return [
        {
            "id": str(b.pk),
            **_emp_brief(b.employee),
            "bonus_item_id": str(b.bonus_item_id) if b.bonus_item_id else None,
            "bonus_item_name": b.bonus_item.name if b.bonus_item_id else "",
            "description": b.description,
            "amount": str(_dec(b.amount)),
            "bonus_date": b.bonus_date.isoformat(),
            "notes": b.notes,
        }
        for b in qs.order_by("-bonus_date")[:500]
    ]


@transaction.atomic(using="tenant")
def create_bonus(data: dict) -> dict:
    emp = User.objects.using(_USING).get(pk=data["employee_id"], is_active=True)
    item = None
    if data.get("bonus_item_id"):
        item = BonusItem.objects.using(_USING).get(pk=data["bonus_item_id"], is_active=True)
    b = EmployeeBonus.objects.using(_USING).create(
        employee=emp,
        bonus_item=item,
        description=(data.get("description") or "").strip(),
        amount=_dec(data.get("amount", 0)),
        bonus_date=parse_required_date(data.get("bonus_date")),
        notes=(data.get("notes") or "").strip(),
    )
    return list_bonuses()[0] if False else {
        "id": str(b.pk),
        **_emp_brief(emp),
        "bonus_item_id": str(item.pk) if item else None,
        "bonus_item_name": item.name if item else "",
        "description": b.description,
        "amount": str(_dec(b.amount)),
        "bonus_date": b.bonus_date.isoformat(),
        "notes": b.notes,
    }


def list_deductions(*, year: int | None = None, month: int | None = None) -> list[dict]:
    qs = EmployeeDeduction.objects.using(_USING).select_related("employee", "deduction_item")
    if year and month:
        qs = qs.filter(deduction_date__year=year, deduction_date__month=month)
    return [
        {
            "id": str(d.pk),
            **_emp_brief(d.employee),
            "deduction_item_id": str(d.deduction_item_id) if d.deduction_item_id else None,
            "deduction_item_name": d.deduction_item.name if d.deduction_item_id else "",
            "description": d.description,
            "amount": str(_dec(d.amount)),
            "deduction_date": d.deduction_date.isoformat(),
            "notes": d.notes,
        }
        for d in qs.order_by("-deduction_date")[:500]
    ]


@transaction.atomic(using="tenant")
def create_deduction(data: dict) -> dict:
    emp = User.objects.using(_USING).get(pk=data["employee_id"], is_active=True)
    item = None
    if data.get("deduction_item_id"):
        item = DeductionItem.objects.using(_USING).get(pk=data["deduction_item_id"], is_active=True)
    d = EmployeeDeduction.objects.using(_USING).create(
        employee=emp,
        deduction_item=item,
        description=(data.get("description") or "").strip(),
        amount=_dec(data.get("amount", 0)),
        deduction_date=parse_required_date(data.get("deduction_date")),
        notes=(data.get("notes") or "").strip(),
    )
    return {
        "id": str(d.pk),
        **_emp_brief(emp),
        "deduction_item_id": str(item.pk) if item else None,
        "deduction_item_name": item.name if item else "",
        "description": d.description,
        "amount": str(_dec(d.amount)),
        "deduction_date": d.deduction_date.isoformat(),
        "notes": d.notes,
    }


def list_allowance_assignments() -> list[dict]:
    return [
        {
            "id": str(a.pk),
            **_emp_brief(a.employee),
            "allowance_item_id": str(a.allowance_item_id),
            "allowance_item_name": a.allowance_item.name,
            "allowance_item_code": a.allowance_item.code,
            "amount": str(_dec(a.amount)),
            "is_active": a.is_active,
        }
        for a in EmployeeAllowanceAssignment.objects.using(_USING)
        .select_related("employee", "allowance_item")
        .filter(is_active=True)
    ]


@transaction.atomic(using="tenant")
def upsert_allowance_assignment(data: dict) -> dict:
    emp = User.objects.using(_USING).get(pk=data["employee_id"], is_active=True)
    item = AllowanceItem.objects.using(_USING).get(pk=data["allowance_item_id"], is_active=True)
    a, _ = EmployeeAllowanceAssignment.objects.using(_USING).update_or_create(
        employee=emp,
        allowance_item=item,
        defaults={"amount": _dec(data.get("amount", 0)), "is_active": True},
    )
    return {
        "id": str(a.pk),
        **_emp_brief(emp),
        "allowance_item_id": str(item.pk),
        "allowance_item_name": item.name,
        "allowance_item_code": item.code,
        "amount": str(_dec(a.amount)),
        "is_active": a.is_active,
    }


@transaction.atomic(using="tenant")
def deactivate_allowance_assignment(pk) -> None:
    EmployeeAllowanceAssignment.objects.using(_USING).filter(pk=pk).update(is_active=False)


def list_leaves() -> list[dict]:
    return [
        {
            "id": str(lv.pk),
            **_emp_brief(lv.employee),
            "leave_type_id": str(lv.leave_type_id),
            "leave_type_name": lv.leave_type.name,
            "start_date": lv.start_date.isoformat(),
            "end_date": lv.end_date.isoformat() if lv.end_date else None,
            "unit": lv.unit,
            "quantity": str(lv.quantity),
            "notes": lv.notes,
        }
        for lv in EmployeeLeave.objects.using(_USING).select_related("employee", "leave_type").order_by(
            "-start_date"
        )[:500]
    ]


@transaction.atomic(using="tenant")
def create_leave(data: dict) -> dict:
    emp = User.objects.using(_USING).get(pk=data["employee_id"], is_active=True)
    lt = LeaveType.objects.using(_USING).get(pk=data["leave_type_id"], is_active=True)
    end = data.get("end_date")
    lv = EmployeeLeave.objects.using(_USING).create(
        employee=emp,
        leave_type=lt,
        start_date=parse_required_date(data.get("start_date")),
        end_date=parse_optional_date(end),
        unit=data.get("unit") or EmployeeLeave.Unit.DAYS,
        quantity=Decimal(str(data.get("quantity", 1))),
        notes=(data.get("notes") or "").strip(),
    )
    return {
        "id": str(lv.pk),
        **_emp_brief(emp),
        "leave_type_id": str(lt.pk),
        "leave_type_name": lt.name,
        "start_date": lv.start_date.isoformat(),
        "end_date": lv.end_date.isoformat() if lv.end_date else None,
        "unit": lv.unit,
        "quantity": str(lv.quantity),
        "notes": lv.notes,
    }


def _parse_time(val) -> time | None:
    if not val:
        return None
    if isinstance(val, time):
        return val
    s = str(val).strip()
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    raise ValidationError("صيغة الوقت غير صالحة.")


def _time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def _calc_late_overtime(user: User, work_date: date, check_in: time | None, check_out: time | None) -> tuple[int, int]:
    late = 0
    overtime = 0
    if not user.work_shift_id or not check_in:
        return late, overtime
    shift = user.work_shift
    if not shift or not shift.weekly_schedule:
        return late, overtime
    day_key = _WEEKDAY_MAP.get(work_date.weekday(), "monday")
    day_cfg = next((d for d in shift.weekly_schedule if d.get("day") == day_key), None)
    if not day_cfg or day_cfg.get("is_off"):
        return late, overtime
    start_s = day_cfg.get("start_time") or "09:00"
    end_s = day_cfg.get("end_time") or "17:00"
    try:
        sched_start = datetime.strptime(start_s, "%H:%M").time()
        sched_end = datetime.strptime(end_s, "%H:%M").time()
    except ValueError:
        return late, overtime
    in_min = _time_to_minutes(check_in)
    start_min = _time_to_minutes(sched_start)
    if in_min > start_min:
        late = in_min - start_min
    if check_out:
        out_min = _time_to_minutes(check_out)
        end_min = _time_to_minutes(sched_end)
        if out_min > end_min:
            overtime = out_min - end_min
    return late, overtime


def _empty_periods() -> list[dict]:
    return [{"check_in": None, "check_out": None} for _ in range(3)]


def _time_label(value: time | None) -> str | None:
    if not value:
        return None
    return value.strftime("%H:%M")


def _sanitize_periods(raw) -> list[dict]:
    periods = _empty_periods()
    if not isinstance(raw, list):
        return periods
    for i, item in enumerate(raw[:3]):
        if not isinstance(item, dict):
            continue
        cin = item.get("check_in")
        cout = item.get("check_out")
        periods[i] = {
            "check_in": (str(cin).strip()[:5] if cin else None) or None,
            "check_out": (str(cout).strip()[:5] if cout else None) or None,
        }
    return periods


def _periods_from_record(rec: AttendanceRecord) -> list[dict]:
    stored = getattr(rec, "periods", None) or []
    if isinstance(stored, list) and any(
        (p or {}).get("check_in") or (p or {}).get("check_out") for p in stored if isinstance(p, dict)
    ):
        return _sanitize_periods(stored)
    periods = _empty_periods()
    periods[0] = {
        "check_in": _time_label(rec.check_in),
        "check_out": _time_label(rec.check_out),
    }
    return periods


def _serialize_attendance(rec: AttendanceRecord) -> dict:
    periods = _periods_from_record(rec)
    return {
        "id": str(rec.pk),
        **_emp_brief(rec.employee),
        "work_date": rec.work_date.isoformat(),
        "check_in": rec.check_in.isoformat() if rec.check_in else None,
        "check_out": rec.check_out.isoformat() if rec.check_out else None,
        "periods": periods,
        "late_minutes": rec.late_minutes,
        "overtime_minutes": rec.overtime_minutes,
        "source": rec.source,
        "notes": rec.notes,
    }


def list_attendance(*, from_date: str | None = None, to_date: str | None = None, employee_id=None) -> list[dict]:
    qs = AttendanceRecord.objects.using(_USING).select_related("employee")
    if from_date:
        qs = qs.filter(work_date__gte=date.fromisoformat(from_date))
    if to_date:
        qs = qs.filter(work_date__lte=date.fromisoformat(to_date))
    if employee_id:
        qs = qs.filter(employee_id=employee_id)
    return [_serialize_attendance(r) for r in qs.order_by("-work_date")[:1000]]


@transaction.atomic(using="tenant")
def upsert_attendance(data: dict) -> dict:
    emp = User.objects.using(_USING).get(pk=data["employee_id"], is_active=True)
    work_date = parse_required_date(data.get("work_date"))
    periods = _sanitize_periods(data["periods"]) if "periods" in data else None
    check_in = _parse_time(data.get("check_in"))
    check_out = _parse_time(data.get("check_out"))
    if periods is None:
        periods = _empty_periods()
        periods[0] = {
            "check_in": _time_label(check_in),
            "check_out": _time_label(check_out),
        }
    else:
        check_in = _parse_time(periods[0].get("check_in"))
        check_out = _parse_time(periods[0].get("check_out"))
    late, overtime = _calc_late_overtime(emp, work_date, check_in, check_out)
    if "late_minutes" in data:
        late = int(data["late_minutes"])
    if "overtime_minutes" in data:
        overtime = int(data["overtime_minutes"])
    source = data.get("source") or AttendanceRecord.Source.MANUAL
    rec, _ = AttendanceRecord.objects.using(_USING).update_or_create(
        employee=emp,
        work_date=work_date,
        defaults={
            "check_in": check_in,
            "check_out": check_out,
            "periods": periods,
            "late_minutes": late,
            "overtime_minutes": overtime,
            "source": source,
            "notes": (data.get("notes") or "").strip(),
        },
    )
    return _serialize_attendance(rec)


@transaction.atomic(using="tenant")
def delete_attendance(record_id) -> None:
    deleted, _ = AttendanceRecord.objects.using(_USING).filter(pk=record_id).delete()
    if not deleted:
        raise ValidationError("السجل غير موجود.")


@transaction.atomic(using="tenant")
def import_attendance_rows(actor, rows: list[dict], *, file_name: str = "") -> dict:
    batch = AttendanceImportBatch.objects.using(_USING).create(
        file_name=file_name or "import",
        records_count=len(rows),
        created_by=actor,
        status=AttendanceImportBatch.Status.PENDING,
    )
    imported = 0
    errors: list[str] = []
    for i, row in enumerate(rows):
        try:
            code = (row.get("employee_code") or row.get("code") or "").strip()
            if not code:
                raise ValidationError("كود الموظف مطلوب.")
            emp = User.objects.using(_USING).get(employee_code=code, is_active=True)
            upsert_attendance(
                {
                    "employee_id": str(emp.pk),
                    "work_date": row["work_date"],
                    "check_in": row.get("check_in"),
                    "check_out": row.get("check_out"),
                    "periods": row.get("periods"),
                    "source": AttendanceRecord.Source.FINGERPRINT,
                    "notes": row.get("notes") or "",
                }
            )
            imported += 1
        except Exception as e:
            errors.append(f"سطر {i + 1}: {e}")
    batch.imported_count = imported
    batch.status = (
        AttendanceImportBatch.Status.DONE
        if not errors
        else AttendanceImportBatch.Status.DONE if imported else AttendanceImportBatch.Status.FAILED
    )
    if errors:
        batch.error_message = "\n".join(errors[:20])
    batch.save(using=_USING)
    return {
        "batch_id": str(batch.pk),
        "records_count": batch.records_count,
        "imported_count": imported,
        "errors": errors[:20],
        "status": batch.status,
    }


def list_commission_records(*, year: int | None = None, month: int | None = None) -> list[dict]:
    qs = EmployeeCommissionRecord.objects.using(_USING).select_related("employee")
    if year and month:
        qs = qs.filter(period_date__year=year, period_date__month=month)
    return [
        {
            "id": str(c.pk),
            **_emp_brief(c.employee),
            "period_type": c.period_type,
            "period_date": c.period_date.isoformat(),
            "sales_amount": str(_dec(c.sales_amount)),
            "commission_amount": str(_dec(c.commission_amount)),
            "notes": c.notes,
        }
        for c in qs.order_by("-period_date")[:500]
    ]


@transaction.atomic(using="tenant")
def create_commission_record(data: dict) -> dict:
    emp = User.objects.using(_USING).get(pk=data["employee_id"], is_active=True)
    c = EmployeeCommissionRecord.objects.using(_USING).create(
        employee=emp,
        period_type=data.get("period_type") or EmployeeCommissionRecord.PeriodType.MONTHLY,
        period_date=parse_required_date(data.get("period_date")),
        sales_amount=_dec(data.get("sales_amount", 0)),
        commission_amount=_dec(data.get("commission_amount", 0)),
        notes=(data.get("notes") or "").strip(),
    )
    return {
        "id": str(c.pk),
        **_emp_brief(emp),
        "period_type": c.period_type,
        "period_date": c.period_date.isoformat(),
        "sales_amount": str(_dec(c.sales_amount)),
        "commission_amount": str(_dec(c.commission_amount)),
        "notes": c.notes,
    }


def employee_commission_sales_report(
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    branch_id: str | None = None,
) -> dict:
    """تقرير عمولات ومبيعات الموظفين — صافي المبيعات بسعري المستهلك والشراء."""
    from erp.sale_models import SaleLine
    from erp.services.inventory_extended import _variant_unit_price

    qs = (
        SaleLine.objects.using(_USING)
        .filter(sale__status="completed", seller__isnull=False)
        .select_related("sale", "variant__product", "seller")
    )
    if branch_id:
        qs = qs.filter(sale__branch_id=branch_id)
    if date_from:
        qs = qs.filter(sale__created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(sale__created_at__date__lte=date_to)

    aggregates: dict[str, dict[str, Decimal]] = {}
    for line in qs.iterator():
        sid = str(line.seller_id)
        bucket = aggregates.setdefault(
            sid,
            {
                "consumer_sales": Decimal("0"),
                "purchase_sales": Decimal("0"),
                "net_commission": Decimal("0"),
            },
        )
        consumer = _dec(line.line_total)
        bucket["consumer_sales"] += consumer
        bucket["net_commission"] += _dec(line.line_commission)
        if line.variant_id and line.variant:
            purchase_unit = _variant_unit_price(line.variant, "purchase_price")
            bucket["purchase_sales"] += (purchase_unit * line.quantity).quantize(_QUANT)
        elif consumer > 0:
            bucket["purchase_sales"] += (consumer * Decimal("0.75")).quantize(_QUANT)

    users = (
        User.objects.using(_USING)
        .filter(is_active=True)
        .select_related(
            "department",
            "hr_section",
            "default_branch",
            "employee_profile__job_title",
        )
        .order_by("employee_code", "full_name")
    )

    rows: list[dict] = []
    total_consumer = Decimal("0")
    total_purchase = Decimal("0")
    total_commission = Decimal("0")

    for user in users:
        sid = str(user.pk)
        agg = aggregates.get(
            sid,
            {
                "consumer_sales": Decimal("0"),
                "purchase_sales": Decimal("0"),
                "net_commission": Decimal("0"),
            },
        )
        profile = getattr(user, "employee_profile", None)
        extra = profile.extra_data if profile else {}
        branch_name = str(extra.get("work_branch") or "")
        if not branch_name and user.default_branch_id:
            branch_name = user.default_branch.name_ar or user.default_branch.code

        sales_percent = ""
        if profile:
            if profile.commission_mode == EmployeeProfile.CommissionMode.PERCENT:
                sales_percent = f"{_dec(profile.commission_percent)}%"
            elif profile.commission_mode == EmployeeProfile.CommissionMode.PER_THOUSAND:
                sales_percent = f"{_dec(profile.commission_per_1000)}‰"

        consumer = agg["consumer_sales"].quantize(_QUANT)
        purchase = agg["purchase_sales"].quantize(_QUANT)
        commission = agg["net_commission"].quantize(_QUANT)

        total_consumer += consumer
        total_purchase += purchase
        total_commission += commission

        rows.append(
            {
                "employee_id": sid,
                "employee_code": user.employee_code or "",
                "full_name": user.full_name or user.username,
                "job_title_name": profile.job_title.name if profile and profile.job_title_id else "",
                "department_name": user.department.name if user.department_id else "",
                "hr_section_name": user.hr_section.name if user.hr_section_id else "",
                "branch_name": branch_name,
                "consumer_sales": str(consumer),
                "purchase_sales": str(purchase),
                "sales_percent": sales_percent,
                "net_commission": str(commission),
            }
        )

    rows.sort(key=lambda r: (-Decimal(r["consumer_sales"]), r["employee_code"]))

    return {
        "rows": rows,
        "totals": {
            "consumer_sales": str(total_consumer.quantize(_QUANT)),
            "purchase_sales": str(total_purchase.quantize(_QUANT)),
            "net_commission": str(total_commission.quantize(_QUANT)),
        },
        "employee_count": len(rows),
    }


def _month_range(year: int, month: int) -> tuple[date, date]:
    last = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last)


def _sum_period(model, employee, date_field: str, start: date, end: date) -> Decimal:
    filt = {f"{date_field}__gte": start, f"{date_field}__lte": end, "employee": employee}
    return _dec(model.objects.using(_USING).filter(**filt).aggregate(s=Sum("amount"))["s"] or 0)


def compute_employee_payroll(user: User, year: int, month: int) -> dict:
    start, end = _month_range(year, month)
    pay = _pay_totals(user)
    basic = Decimal(pay["basic_salary"])
    increases = Decimal(pay["total_increases"])
    current = Decimal(pay["current_salary"])

    legacy_allow = Decimal(pay["total_allowances"])
    assigned = (
        EmployeeAllowanceAssignment.objects.using(_USING)
        .filter(employee=user, is_active=True)
        .aggregate(s=Sum("amount"))["s"]
        or 0
    )
    total_allowances = _dec(legacy_allow + _dec(assigned))

    bonuses = _sum_period(EmployeeBonus, user, "bonus_date", start, end)
    deductions = _sum_period(EmployeeDeduction, user, "deduction_date", start, end)
    commissions = (
        EmployeeCommissionRecord.objects.using(_USING)
        .filter(employee=user, period_date__gte=start, period_date__lte=end)
        .aggregate(s=Sum("commission_amount"))["s"]
        or 0
    )
    commissions = _dec(commissions)

    scheduled_due = _advance_installment_due(user, year, month)
    unscheduled_due = _unscheduled_advances_due(user)
    advances_due = (scheduled_due + unscheduled_due).quantize(_QUANT)

    paid_advances = (
        PayrollPayment.objects.using(_USING)
        .filter(
            employee=user,
            payment_date__gte=start,
            payment_date__lte=end,
            payment_type__code__in=("PT-02", "PT-04"),
        )
        .aggregate(s=Sum("amount"))["s"]
        or 0
    )

    gross = current + total_allowances + bonuses + commissions
    net = (gross - deductions - advances_due).quantize(_QUANT)

    return {
        **_emp_brief(user),
        "year": year,
        "month": month,
        "basic_salary": str(basic),
        "total_increases": str(increases),
        "current_salary": str(current),
        "total_allowances": str(total_allowances),
        "total_bonuses": str(bonuses),
        "total_commissions": str(commissions),
        "total_deductions": str(deductions),
        "advances_balance": str(advances_due),
        "scheduled_advance_deduction": str(scheduled_due),
        "unscheduled_advances_balance": str(unscheduled_due),
        "advances_paid_period": str(_dec(paid_advances)),
        "gross_salary": str(gross.quantize(_QUANT)),
        "net_salary": str(net),
    }


def get_payroll_sheet(year: int, month: int, *, branch_id: str | None = None) -> dict:
    users = User.objects.using(_USING).filter(is_active=True, is_owner=False)
    if branch_id:
        branch_q = Q(default_branch_id=branch_id)
        # Employees created without branch assignment still belong to payroll when only one branch exists.
        if Branch.objects.using(_USING).filter(is_active=True).count() <= 1:
            branch_q |= Q(default_branch_id__isnull=True)
        users = users.filter(branch_q)
    users = users.order_by("employee_code", "username")
    rows = [compute_employee_payroll(u, year, month) for u in users]

    def _sum_key(key: str) -> str:
        total = sum((_dec(r[key]) for r in rows), Decimal("0"))
        return str(total.quantize(_QUANT))

    totals = {
        "current_salary": _sum_key("current_salary"),
        "total_allowances": _sum_key("total_allowances"),
        "total_bonuses": _sum_key("total_bonuses"),
        "total_commissions": _sum_key("total_commissions"),
        "total_deductions": _sum_key("total_deductions"),
        "net_salary": _sum_key("net_salary"),
    }
    return {"year": year, "month": month, "branch_id": branch_id, "rows": rows, "totals": totals}


def _next_payroll_statement_code() -> str:
    count = PayrollStatement.objects.using(_USING).count() + 1
    return f"APR-{count:03d}"


def _serialize_payroll_statement(st: PayrollStatement) -> dict:
    creator = st.created_by
    return {
        "id": str(st.pk),
        "code": st.code,
        "period_year": st.period_year,
        "period_month": st.period_month,
        "total_amount": str(_dec(st.total_amount)),
        "status": st.status,
        **_branch_stamp(st.branch),
        **_actor_stamp(creator),
        "created_at": st.created_at.date().isoformat() if st.created_at else None,
    }


def list_payroll_statements(*, q: str = "") -> list[dict]:
    qs = PayrollStatement.objects.using(_USING).select_related("branch", "created_by").order_by(
        "-created_at"
    )
    if q:
        needle = q.strip().lower()
        rows = [_serialize_payroll_statement(st) for st in qs[:500]]
        return [
            r
            for r in rows
            if needle in r["code"].lower()
            or needle in (r.get("branch_name") or "").lower()
            or needle in (r.get("created_by_name") or "").lower()
        ]
    return [_serialize_payroll_statement(st) for st in qs[:500]]


@transaction.atomic(using="tenant")
def create_payroll_statement(actor, data: dict) -> dict:
    from erp.models import Branch

    year = int(data["period_year"])
    month = int(data["period_month"])
    branch = Branch.objects.using(_USING).get(pk=data["branch_id"], is_active=True)
    if PayrollStatement.objects.using(_USING).filter(
        period_year=year, period_month=month, branch=branch
    ).exists():
        raise ValidationError("يوجد كشف رواتب لنفس الشهر والفرع مسبقاً.")

    sheet = get_payroll_sheet(year, month, branch_id=str(branch.pk))
    total = Decimal(sheet["totals"]["net_salary"])
    st = PayrollStatement.objects.using(_USING).create(
        code=_next_payroll_statement_code(),
        period_year=year,
        period_month=month,
        branch=branch,
        total_amount=total,
        status=PayrollStatement.Status.APPROVED,
        created_by=actor,
    )
    out = _serialize_payroll_statement(st)
    out["sheet"] = sheet
    return out


def get_payroll_statement(pk) -> dict:
    st = PayrollStatement.objects.using(_USING).select_related("branch", "created_by").get(pk=pk)
    sheet = get_payroll_sheet(
        st.period_year, st.period_month, branch_id=str(st.branch_id)
    )
    out = _serialize_payroll_statement(st)
    out["sheet"] = sheet
    return out


@transaction.atomic(using="tenant")
def delete_payroll_statement(pk) -> None:
    PayrollStatement.objects.using(_USING).filter(pk=pk).delete()


def list_payroll_payments(*, year: int | None = None, month: int | None = None) -> list[dict]:
    qs = PayrollPayment.objects.using(_USING).select_related("employee", "payment_type")
    if year and month:
        qs = qs.filter(payment_date__year=year, payment_date__month=month)
    return [_serialize_payment(p) for p in qs.select_related("employee", "payment_type", "branch", "created_by").order_by("-payment_date")[:500]]


def _serialize_payment(p: PayrollPayment) -> dict:
    return {
        "id": str(p.pk),
        **_emp_brief(p.employee),
        "payment_type_id": str(p.payment_type_id),
        "payment_type_name": p.payment_type.name,
        "payment_type_code": p.payment_type.code,
        "amount": str(_dec(p.amount)),
        "payment_date": p.payment_date.isoformat(),
        "period_year": p.period_year,
        "period_month": p.period_month,
        "notes": p.notes,
        "grant_reason": getattr(p, "grant_reason", "") or "",
        **_branch_stamp(p.branch),
        **_actor_stamp(p.created_by),
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@transaction.atomic(using="tenant")
def create_payroll_payment(actor, data: dict) -> dict:
    emp = User.objects.using(_USING).get(pk=data["employee_id"], is_active=True)
    pt = PayrollPaymentType.objects.using(_USING).get(pk=data["payment_type_id"], is_active=True)
    amount = _dec(data.get("amount", 0))
    if amount <= 0:
        raise ValidationError("المبلغ يجب أن يكون أكبر من صفر.")
    period_year = data.get("period_year")
    period_month = data.get("period_month")
    if period_year and period_month:
        assert_pay_period_allowed(int(period_year), int(period_month))
    advance = None
    if data.get("advance_id"):
        advance = EmployeeAdvance.objects.using(_USING).get(pk=data["advance_id"], employee=emp)
        advance.settled_amount = _dec(advance.settled_amount) + amount
        advance.save(using=_USING, update_fields=["settled_amount"])
    branch = emp.default_branch
    p = PayrollPayment.objects.using(_USING).create(
        employee=emp,
        payment_type=pt,
        amount=amount,
        payment_date=parse_required_date(data.get("payment_date")),
        period_year=period_year,
        period_month=period_month,
        advance=advance,
        notes=(data.get("notes") or "").strip(),
        grant_reason=(data.get("grant_reason") or "").strip(),
        branch=branch,
        created_by=actor,
    )
    return _serialize_payment(p)


@transaction.atomic(using="tenant")
def create_advance(actor, data: dict) -> dict:
    emp = User.objects.using(_USING).get(pk=data["employee_id"], is_active=True)
    amount = _dec(data.get("amount", 0))
    if amount <= 0:
        raise ValidationError("مبلغ السلفة يجب أن يكون أكبر من صفر.")
    advance_date = parse_required_date(data.get("advance_date"))
    is_scheduled = bool(data.get("is_scheduled") or data.get("schedule_installments"))
    months = int(data.get("installment_months") or 0)
    if is_scheduled and months < 1:
        raise ValidationError("حدد عدد أشهر التقسيط.")
    start_year = int(data.get("start_year") or advance_date.year)
    start_month = int(data.get("start_month") or advance_date.month)
    monthly = (amount / Decimal(months)).quantize(_QUANT) if is_scheduled and months else None
    branch = emp.default_branch
    a = EmployeeAdvance.objects.using(_USING).create(
        employee=emp,
        amount=amount,
        advance_date=advance_date,
        notes=(data.get("notes") or "").strip(),
        is_scheduled=is_scheduled,
        installment_months=months if is_scheduled else None,
        monthly_installment=monthly,
        branch=branch,
        created_by=actor,
    )
    if is_scheduled and months and monthly:
        _create_advance_installments(a, start_year=start_year, start_month=start_month, months=months, monthly=monthly)
    return _serialize_advance(a)


def _serialize_advance(a: EmployeeAdvance) -> dict:
    installments = [
        {
            "period_year": inst.period_year,
            "period_month": inst.period_month,
            "amount": str(_dec(inst.amount)),
            "status": inst.status,
        }
        for inst in a.installments.all().order_by("period_year", "period_month")
    ]
    return {
        "id": str(a.pk),
        **_emp_brief(a.employee),
        "amount": str(_dec(a.amount)),
        "settled_amount": str(_dec(a.settled_amount)),
        "balance": str(_dec(a.amount - a.settled_amount)),
        "advance_date": a.advance_date.isoformat(),
        "notes": a.notes,
        "is_scheduled": a.is_scheduled,
        "installment_months": a.installment_months,
        "monthly_installment": str(_dec(a.monthly_installment)) if a.monthly_installment else None,
        "installments": installments,
        **_branch_stamp(a.branch),
        **_actor_stamp(a.created_by),
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "is_active": a.is_active,
    }


def list_advances() -> list[dict]:
    qs = (
        EmployeeAdvance.objects.using(_USING)
        .select_related("employee", "branch", "created_by")
        .prefetch_related("installments")
        .filter(is_active=True)
        .order_by("-advance_date")[:200]
    )
    return [_serialize_advance(a) for a in qs]


def seed_hr_payroll_catalogs() -> dict:
    created = {}
    catalogs = [
        (BonusItem, "BI", [
            ("BI-01", "مكافأة تحقيق التارجت"),
            ("BI-02", "مكافأة انتظام"),
        ]),
        (DeductionItem, "DI", [
            ("DI-01", "غياب"),
            ("DI-02", "تأخير"),
            ("DI-03", "تلفيات"),
            ("DI-04", "جزاءات"),
            ("DI-05", "سداد سلفة مرحلة"),
        ]),
        (AllowanceItem, "AL", [
            ("AL-01", "بدل مواصلات"),
            ("AL-02", "بدل وجبة"),
            ("AL-03", "بدل سكن"),
        ]),
        (LeaveType, "LV", [
            ("LV-01", "مرضى"),
            ("LV-02", "اعتيادية"),
            ("LV-03", "عارضة"),
        ]),
        (PayrollPaymentType, "PT", [
            ("PT-01", "مرتب"),
            ("PT-02", "سلفة"),
            ("PT-03", "منحة"),
            ("PT-04", "سلفة مرحلة"),
        ]),
    ]
    for model, prefix, items in catalogs:
        key = model.__name__
        created[key] = 0
        for code, name in items:
            _, was = model.objects.using(_USING).get_or_create(code=code, defaults={"name": name})
            if was:
                created[key] += 1
    holidays = [
        ("عيد الفطر", "2026-03-30"),
        ("6 أكتوبر", "2026-10-06"),
        ("شم النسيم", "2026-04-13"),
    ]
    created["OfficialHoliday"] = 0
    for name, d in holidays:
        _, was = OfficialHoliday.objects.using(_USING).get_or_create(
            name=name, holiday_date=date.fromisoformat(d), defaults={"is_recurring": True}
        )
        if was:
            created["OfficialHoliday"] += 1
    return created


def ensure_payroll_seeded():
    if BonusItem.objects.using(_USING).filter(is_active=True).count() == 0:
        seed_hr_payroll_catalogs()
