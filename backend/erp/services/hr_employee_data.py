"""مسميات وظيفية، مجموعات موظفين، بيانات الموظف المالية."""

from __future__ import annotations

import os
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import PermissionDenied, ValidationError

from erp.dates import parse_required_date

from erp.hr_structure_models import (
    EmployeeAllowance,
    EmployeeGroup,
    EmployeeProfile,
    EmployeeSalaryIncrease,
    JobTitle,
)
from erp.models import User
from erp.permissions import can_access_page
from erp.services.hr import next_employee_code, seed_hr_org_defaults

_USING = "tenant"
_QUANT = Decimal("0.01")
_PHOTO_MAX_BYTES = 3 * 1024 * 1024
_ID_CARD_MAX_BYTES = 10 * 1024 * 1024
_ID_CARD_ALLOWED = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


def _can_view_id_card(viewer: User | None) -> bool:
    if not viewer or not viewer.is_authenticated:
        return False
    return viewer.is_owner or can_access_page(viewer, "create-users")


def _media_url(request, file_field) -> str:
    if not file_field:
        return ""
    url = file_field.url
    if request:
        return request.build_absolute_uri(url)
    return url


def _validate_photo(upload) -> None:
    if not upload:
        raise ValidationError("لم يتم اختيار صورة.")
    if upload.size > _PHOTO_MAX_BYTES:
        raise ValidationError("حجم الصورة يجب ألا يتجاوز 3 ميجابايت.")
    content_type = (getattr(upload, "content_type", "") or "").lower()
    if content_type and not content_type.startswith("image/"):
        raise ValidationError("يجب أن تكون الصورة بصيغة صورة (JPG, PNG, WEBP).")


def _validate_id_card(upload) -> None:
    if not upload:
        raise ValidationError("لم يتم اختيار ملف.")
    if upload.size > _ID_CARD_MAX_BYTES:
        raise ValidationError("حجم الملف يجب ألا يتجاوز 10 ميجابايت.")
    ext = os.path.splitext(getattr(upload, "name", "") or "")[1].lower()
    if ext not in _ID_CARD_ALLOWED:
        raise ValidationError("الملف المسموح: PDF أو صورة (JPG, PNG, WEBP).")


def _dec(val) -> Decimal:
    if val is None or val == "":
        return Decimal("0")
    return Decimal(str(val)).quantize(_QUANT)


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


def list_job_titles() -> list[dict]:
    return [
        {
            "id": str(t.pk),
            "code": t.code,
            "name": t.name,
            "job_level": t.job_level or "B",
            "is_active": t.is_active,
        }
        for t in JobTitle.objects.using(_USING).filter(is_active=True)
    ]


@transaction.atomic(using="tenant")
def create_job_title(*, name: str, code: str | None = None, job_level: str = "B") -> dict:
    name = name.strip()
    if not name:
        raise ValidationError("اسم المسمى مطلوب.")
    final = (code or _next_code("JT", JobTitle)).strip().upper()
    if JobTitle.objects.using(_USING).filter(code=final).exists():
        raise ValidationError(f"الكود '{final}' مستخدم.")
    level = (job_level or "B").strip().upper()[:10] or "B"
    t = JobTitle.objects.using(_USING).create(code=final, name=name, job_level=level)
    return {
        "id": str(t.pk),
        "code": t.code,
        "name": t.name,
        "job_level": t.job_level,
        "is_active": True,
    }


@transaction.atomic(using="tenant")
def update_job_title(pk, *, name: str, job_level: str | None = None) -> dict:
    t = JobTitle.objects.using(_USING).get(pk=pk, is_active=True)
    t.name = name.strip()
    if not t.name:
        raise ValidationError("اسم المسمى مطلوب.")
    if job_level is not None:
        t.job_level = (job_level or "B").strip().upper()[:10] or "B"
    t.save(using=_USING)
    return {
        "id": str(t.pk),
        "code": t.code,
        "name": t.name,
        "job_level": t.job_level,
        "is_active": t.is_active,
    }


def list_employee_groups() -> list[dict]:
    return [
        {
            "id": str(g.pk),
            "code": g.code,
            "name": g.name,
            "description": g.description,
            "color": g.color or "blue",
            "is_active": g.is_active,
        }
        for g in EmployeeGroup.objects.using(_USING).filter(is_active=True)
    ]


@transaction.atomic(using="tenant")
def create_employee_group(
    *,
    name: str,
    code: str | None = None,
    description: str = "",
    color: str = "blue",
) -> dict:
    name = name.strip()
    if not name:
        raise ValidationError("اسم المجموعة مطلوب.")
    final = (code or _next_code("EG", EmployeeGroup)).strip().upper()
    if EmployeeGroup.objects.using(_USING).filter(code=final).exists():
        raise ValidationError(f"الكود '{final}' مستخدم.")
    g = EmployeeGroup.objects.using(_USING).create(
        code=final,
        name=name,
        description=description.strip(),
        color=(color or "blue").strip() or "blue",
    )
    return {
        "id": str(g.pk),
        "code": g.code,
        "name": g.name,
        "description": g.description,
        "color": g.color,
        "is_active": True,
    }


@transaction.atomic(using="tenant")
def update_employee_group(
    pk,
    *,
    name: str,
    description: str = "",
    color: str | None = None,
) -> dict:
    g = EmployeeGroup.objects.using(_USING).get(pk=pk, is_active=True)
    g.name = name.strip()
    g.description = description.strip()
    if not g.name:
        raise ValidationError("اسم المجموعة مطلوب.")
    if color is not None:
        g.color = (color or "blue").strip() or "blue"
    g.save(using=_USING)
    return {
        "id": str(g.pk),
        "code": g.code,
        "name": g.name,
        "description": g.description,
        "color": g.color,
        "is_active": g.is_active,
    }


def _pay_totals(user: User) -> dict:
    increases = (
        EmployeeSalaryIncrease.objects.using(_USING)
        .filter(employee=user)
        .aggregate(s=Sum("amount"))["s"]
        or Decimal("0")
    )
    allowances = (
        EmployeeAllowance.objects.using(_USING)
        .filter(employee=user, is_active=True)
        .aggregate(s=Sum("amount"))["s"]
        or Decimal("0")
    )
    profile = getattr(user, "employee_profile", None)
    basic = _dec(profile.basic_salary if profile else 0)
    hire = _dec(profile.hire_salary if profile else 0)
    total_increases = _dec(increases)
    current_salary = (basic + total_increases).quantize(_QUANT)
    return {
        "hire_salary": str(hire),
        "basic_salary": str(basic),
        "total_increases": str(total_increases),
        "current_salary": str(current_salary),
        "total_allowances": str(_dec(allowances)),
        "gross_with_allowances": str((current_salary + _dec(allowances)).quantize(_QUANT)),
    }


def _serialize_allowance(a: EmployeeAllowance) -> dict:
    return {
        "id": str(a.pk),
        "name": a.name,
        "amount": str(_dec(a.amount)),
        "is_active": a.is_active,
    }


def _serialize_increase(inc: EmployeeSalaryIncrease) -> dict:
    return {
        "id": str(inc.pk),
        "amount": str(_dec(inc.amount)),
        "effective_date": inc.effective_date.isoformat(),
        "notes": inc.notes,
    }


def _serialize_profile_row(user: User, *, request=None, viewer: User | None = None) -> dict:
    profile = getattr(user, "employee_profile", None)
    pay = _pay_totals(user)
    commission_label = ""
    if profile:
        if profile.commission_mode == EmployeeProfile.CommissionMode.PERCENT:
            commission_label = f"{profile.commission_percent}%"
        elif profile.commission_mode == EmployeeProfile.CommissionMode.PER_THOUSAND:
            commission_label = f"{profile.commission_per_1000} / 1000"
    row = {
        "id": str(user.pk),
        "employee_code": user.employee_code or "",
        "username": user.username,
        "full_name": user.full_name or user.username,
        "phone": user.phone,
        "email": user.email,
        "is_active": user.is_active,
        "is_owner": user.is_owner,
        "photo_url": _media_url(request, profile.photo if profile else None),
        "department_id": str(user.department_id) if user.department_id else None,
        "department_name": user.department.name if user.department_id else "",
        "hr_section_id": str(user.hr_section_id) if user.hr_section_id else None,
        "hr_section_name": user.hr_section.name if user.hr_section_id else "",
        "work_shift_id": str(user.work_shift_id) if user.work_shift_id else None,
        "work_shift_name": user.work_shift.name if user.work_shift_id else "",
        "job_title_id": str(profile.job_title_id) if profile and profile.job_title_id else None,
        "job_title_name": profile.job_title.name if profile and profile.job_title_id else "",
        "employee_group_id": (
            str(profile.employee_group_id) if profile and profile.employee_group_id else None
        ),
        "employee_group_name": (
            profile.employee_group.name if profile and profile.employee_group_id else ""
        ),
        "hire_date": profile.hire_date.isoformat() if profile and profile.hire_date else None,
        "commission_mode": profile.commission_mode if profile else "none",
        "commission_percent": str(_dec(profile.commission_percent if profile else 0)),
        "commission_per_1000": str(_dec(profile.commission_per_1000 if profile else 0)),
        "commission_label": commission_label,
        "notes": profile.notes if profile else "",
        "extra_data": profile.extra_data if profile else {},
        **pay,
    }
    if _can_view_id_card(viewer):
        row["has_id_card"] = bool(profile and profile.id_card_file)
        row["id_card_filename"] = profile.id_card_filename if profile else ""
    return row


def list_employee_data(*, active_only: bool = True, request=None, viewer: User | None = None) -> list[dict]:
    qs = User.objects.using(_USING).select_related(
        "department",
        "hr_section",
        "work_shift",
        "employee_profile",
        "employee_profile__job_title",
        "employee_profile__employee_group",
    )
    if active_only:
        qs = qs.filter(is_active=True)
    return [_serialize_profile_row(u, request=request, viewer=viewer) for u in qs.order_by("employee_code", "username")]


def get_employee_data(user_id, *, request=None, viewer: User | None = None) -> dict:
    user = (
        User.objects.using(_USING)
        .select_related(
            "department",
            "hr_section",
            "work_shift",
            "employee_profile",
            "employee_profile__job_title",
            "employee_profile__employee_group",
        )
        .get(pk=user_id)
    )
    row = _serialize_profile_row(user, request=request, viewer=viewer)
    row["allowances"] = [
        _serialize_allowance(a)
        for a in EmployeeAllowance.objects.using(_USING).filter(employee=user)
    ]
    row["salary_increases"] = [
        _serialize_increase(i)
        for i in EmployeeSalaryIncrease.objects.using(_USING).filter(employee=user)
    ]
    return row


@transaction.atomic(using="tenant")
def upsert_employee_data(user_id, data: dict, *, request=None, viewer: User | None = None) -> dict:
    user = User.objects.using(_USING).get(pk=user_id)
    if "department_id" in data:
        from erp.models import Department

        if data["department_id"]:
            user.department = Department.objects.using(_USING).get(
                pk=data["department_id"], is_active=True
            )
        else:
            user.department = None
            user.hr_section = None
    if "hr_section_id" in data:
        from erp.hr_structure_models import HrSection

        if data["hr_section_id"]:
            sec = HrSection.objects.using(_USING).get(pk=data["hr_section_id"], is_active=True)
            user.hr_section = sec
            if not user.department_id:
                user.department = sec.department
        else:
            user.hr_section = None
    if "work_shift_id" in data:
        from erp.hr_structure_models import WorkShift

        user.work_shift = (
            WorkShift.objects.using(_USING).get(pk=data["work_shift_id"], is_active=True)
            if data["work_shift_id"]
            else None
        )
    if "full_name" in data:
        user.full_name = (data["full_name"] or "").strip()
    if "phone" in data:
        user.phone = (data["phone"] or "").strip()
    if "email" in data:
        user.email = (data["email"] or "").strip()
    user.save(using=_USING)

    profile, _ = EmployeeProfile.objects.using(_USING).get_or_create(user=user)
    if "hire_date" in data:
        hd = data["hire_date"]
        profile.hire_date = date.fromisoformat(hd) if hd else None
    if "job_title_id" in data:
        profile.job_title = (
            JobTitle.objects.using(_USING).get(pk=data["job_title_id"], is_active=True)
            if data["job_title_id"]
            else None
        )
    if "employee_group_id" in data:
        profile.employee_group = (
            EmployeeGroup.objects.using(_USING).get(pk=data["employee_group_id"], is_active=True)
            if data["employee_group_id"]
            else None
        )
    if "hire_salary" in data:
        profile.hire_salary = _dec(data["hire_salary"])
    if "basic_salary" in data:
        profile.basic_salary = _dec(data["basic_salary"])
    if "commission_mode" in data:
        mode = data["commission_mode"] or "none"
        if mode not in EmployeeProfile.CommissionMode.values:
            raise ValidationError("نوع العمولة غير صالح.")
        profile.commission_mode = mode
    if "commission_percent" in data:
        profile.commission_percent = _dec(data["commission_percent"])
    if "commission_per_1000" in data:
        profile.commission_per_1000 = _dec(data["commission_per_1000"])
    if "notes" in data:
        profile.notes = (data["notes"] or "").strip()
    if "extra_data" in data:
        current = dict(profile.extra_data or {})
        incoming = data.get("extra_data") or {}
        if not isinstance(incoming, dict):
            raise ValidationError("بيانات الموظف الإضافية غير صالحة.")
        current.update(incoming)
        profile.extra_data = current
    profile.save(using=_USING)
    return get_employee_data(user_id, request=request, viewer=viewer)


@transaction.atomic(using="tenant")
def upload_employee_photo(user_id, upload, *, request=None, viewer: User | None = None) -> dict:
    _validate_photo(upload)
    user = User.objects.using(_USING).get(pk=user_id)
    profile, _ = EmployeeProfile.objects.using(_USING).get_or_create(user=user)
    if profile.photo:
        profile.photo.delete(save=False)
    profile.photo = upload
    profile.save(using=_USING)
    return get_employee_data(user_id, request=request, viewer=viewer)


@transaction.atomic(using="tenant")
def upload_employee_id_card(user_id, upload, *, request=None, viewer: User | None = None) -> dict:
    _validate_id_card(upload)
    user = User.objects.using(_USING).get(pk=user_id)
    profile, _ = EmployeeProfile.objects.using(_USING).get_or_create(user=user)
    if profile.id_card_file:
        profile.id_card_file.delete(save=False)
    profile.id_card_file = upload
    profile.id_card_filename = os.path.basename(getattr(upload, "name", "") or "id-card.pdf")
    profile.save(using=_USING)
    return get_employee_data(user_id, request=request, viewer=viewer)


def get_employee_id_card_file(user_id, *, viewer: User):
    if not _can_view_id_card(viewer):
        raise PermissionDenied("عرض بطاقة الهوية متاح للمدير فقط.")
    user = User.objects.using(_USING).select_related("employee_profile").get(pk=user_id)
    profile = getattr(user, "employee_profile", None)
    if not profile or not profile.id_card_file:
        raise ValidationError("لا يوجد ملف بطاقة هوية لهذا الموظف.")
    return profile


@transaction.atomic(using="tenant")
def add_allowance(user_id, *, name: str, amount) -> dict:
    user = User.objects.using(_USING).get(pk=user_id)
    name = name.strip()
    if not name:
        raise ValidationError("اسم البدل مطلوب.")
    a = EmployeeAllowance.objects.using(_USING).create(
        employee=user, name=name, amount=_dec(amount)
    )
    return _serialize_allowance(a)


@transaction.atomic(using="tenant")
def delete_allowance(allowance_id) -> None:
    EmployeeAllowance.objects.using(_USING).filter(pk=allowance_id).update(is_active=False)


@transaction.atomic(using="tenant")
def add_salary_increase(user_id, *, amount, effective_date: str, notes: str = "") -> dict:
    user = User.objects.using(_USING).get(pk=user_id)
    inc = EmployeeSalaryIncrease.objects.using(_USING).create(
        employee=user,
        amount=_dec(amount),
        effective_date=parse_required_date(effective_date),
        notes=notes.strip(),
    )
    return _serialize_increase(inc)


@transaction.atomic(using="tenant")
def delete_salary_increase(increase_id) -> None:
    EmployeeSalaryIncrease.objects.using(_USING).filter(pk=increase_id).delete()


def seed_job_titles_and_groups() -> dict:
    seed_hr_org_defaults()
    created = {"job_titles": 0, "groups": 0}
    titles = [
        ("JT-01", "كاشير"),
        ("JT-02", "بائع"),
        ("JT-03", "أمين مخزن"),
        ("JT-04", "محاسب"),
        ("JT-05", "مندوب مبيعات"),
    ]
    for code, name in titles:
        _, was = JobTitle.objects.using(_USING).get_or_create(code=code, defaults={"name": name})
        if was:
            created["job_titles"] += 1
    groups = [
        ("EG-01", "مجموعة دوام كامل", "موظفون بدوام كامل — قواعد مرتب شهرية"),
        ("EG-02", "مجموعة نص شيفت", "نص شيفت — قواعد مرتب مختلفة"),
        ("EG-03", "مجموعة مندوبين", "مندوبون — عمولة ومبيعات"),
    ]
    for code, name, desc in groups:
        _, was = EmployeeGroup.objects.using(_USING).get_or_create(
            code=code, defaults={"name": name, "description": desc}
        )
        if was:
            created["groups"] += 1
    return created


def ensure_hr_catalogs_seeded():
    if JobTitle.objects.using(_USING).filter(is_active=True).count() == 0:
        seed_job_titles_and_groups()
