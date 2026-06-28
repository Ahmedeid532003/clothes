from __future__ import annotations

from django.db import transaction
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from erp.branch_access import apply_branch_access
from erp.hr_structure_models import (
    EmployeeProfile,
    HrSection,
    WEEKDAY_KEYS,
    WorkShift,
    default_weekly_schedule,
)
from erp.models import Branch, Department, User
from erp.permissions_schema import full_permissions, merge_permissions
from saas.models import GlobalUsername
from tenancy.context import get_current_tenant


def _next_code(prefix: str, model, field: str = "code") -> str:
    existing = (
        model.objects.using("tenant")
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
            n = model.objects.using("tenant").count() + 1
    return f"{prefix}-{n:03d}"


def next_department_code() -> str:
    nums: list[int] = []
    for code in Department.objects.using("tenant").values_list("code", flat=True):
        c = str(code).strip()
        if c.isdigit():
            nums.append(int(c))
    return f"{(max(nums) if nums else 0) + 1:03d}"


def next_hr_section_code(department_id) -> str:
    prefix = "S"
    existing = (
        HrSection.objects.using("tenant")
        .filter(department_id=department_id, code__startswith=prefix)
        .order_by("-code")
        .values_list("code", flat=True)
        .first()
    )
    n = 1
    if existing:
        try:
            n = int(str(existing).split("-")[-1]) + 1
        except ValueError:
            n = HrSection.objects.using("tenant").filter(department_id=department_id).count() + 1
    return f"{prefix}-{n:02d}"


def next_work_shift_code() -> str:
    return _next_code("SH", WorkShift)


def next_employee_code() -> str:
    return _next_code("EMP", User, "employee_code")


def assert_can_add_user() -> None:
    tenant = get_current_tenant()
    if not tenant:
        raise ValidationError("المنشأة غير محددة.")
    count = User.objects.using("tenant").filter(is_active=True).count()
    if count >= tenant.plan.max_users:
        raise ValidationError(
            f"تم الوصول للحد الأقصى للمستخدمين ({tenant.plan.max_users}) حسب باقة "
            f"'{tenant.plan.name}'. يرجى ترقية الباقة."
        )


def _validate_branch_access(data: dict) -> None:
    mode = data.get("branch_access_mode", User.BranchAccessMode.ALL)
    if mode == User.BranchAccessMode.ALL:
        return
    branch_ids = data.get("allowed_branch_ids") or []
    default_id = data.get("default_branch_id")
    if mode == User.BranchAccessMode.SINGLE:
        if not default_id:
            raise ValidationError("اختر الفرع عند تحديد «فرع واحد».")
        branch_ids = [default_id]
    elif not branch_ids:
        raise ValidationError("اختر فرعاً واحداً على الأقل.")
    existing = set(
        Branch.objects.using("tenant")
        .filter(id__in=branch_ids, is_active=True)
        .values_list("id", flat=True)
    )
    if len(existing) != len(set(branch_ids)):
        raise ValidationError("أحد الفروع المحددة غير موجود أو غير نشط.")


def assert_username_available(username: str) -> None:
    username = username.strip().lower()
    if User.objects.using("tenant").filter(username=username).exists():
        raise ValidationError(
            f"اسم المستخدم '{username}' مستخدم بالفعل داخل هذه المنشأة. "
            "اختر اسماً آخر، مثل: sara@shop أو cashier2@shop"
        )
    if GlobalUsername.objects.filter(username=username).exists():
        raise ValidationError(
            f"اسم المستخدم '{username}' محجوز على المنصة لمنشأة أخرى. "
            "اختر اسماً فريداً، مثل: sara@shop أو emp02@shop"
        )


def _allocate_employee_username(*, code: str, tenant) -> str:
    """اسم افتراضي: emp-02@slug — فريد عالمياً ومتوافق مع owner@slug."""
    slug = (tenant.slug if tenant else "shop").strip().lower()
    base = code.strip().lower()
    if not base.startswith("emp-"):
        base = f"emp-{base}"
    candidate = f"{base}@{slug}"
    n = 1
    while (
        GlobalUsername.objects.filter(username=candidate).exists()
        or User.objects.using("tenant").filter(username=candidate).exists()
    ):
        candidate = f"{base}-{n}@{slug}"
        n += 1
    return candidate


def _normalize_new_username(raw: str, *, code: str, tenant) -> str:
    username = (raw or "").strip().lower()
    if not username:
        return _allocate_employee_username(code=code, tenant=tenant)
    if "@" not in username and tenant:
        username = f"{username}@{tenant.slug.strip().lower()}"
    return username


@transaction.atomic(using="tenant")
def create_employee(*, actor: User, data: dict) -> User:
    assert_can_add_user()
    uses_system = data.get("uses_system", True)
    code = data.get("employee_code") or next_employee_code()
    tenant = get_current_tenant()
    username = _normalize_new_username(data.get("username") or "", code=code, tenant=tenant)
    assert_username_available(username)

    department = None
    hr_section = None
    work_shift = None
    if data.get("department_id"):
        try:
            department = Department.objects.using("tenant").get(
                pk=data["department_id"], is_active=True
            )
        except Department.DoesNotExist:
            raise ValidationError("الإدارة غير موجودة.")
    if data.get("hr_section_id"):
        try:
            hr_section = HrSection.objects.using("tenant").select_related("department").get(
                pk=data["hr_section_id"], is_active=True
            )
        except HrSection.DoesNotExist:
            raise ValidationError("القسم الفرعي غير موجود.")
        if department and hr_section.department_id != department.id:
            raise ValidationError("القسم الفرعي لا يتبع الإدارة المحددة.")
        if not department:
            department = hr_section.department
    if data.get("work_shift_id"):
        try:
            work_shift = WorkShift.objects.using("tenant").get(
                pk=data["work_shift_id"], is_active=True
            )
        except WorkShift.DoesNotExist:
            raise ValidationError("الشيفت غير موجود.")

    perms = merge_permissions(data.get("permissions"))
    if data.get("grant_all_permissions"):
        perms = full_permissions()

    if User.objects.using("tenant").filter(employee_code=code).exists():
        raise ValidationError(f"كود الموظف '{code}' مستخدم بالفعل.")

    mode = data.get("branch_access_mode", User.BranchAccessMode.ALL)
    if data.get("grant_all_permissions"):
        mode = User.BranchAccessMode.ALL

    _validate_branch_access(data)

    user = User.objects.db_manager("tenant").create_user(
        username=username,
        password=data.get("password") or None,
        full_name=data.get("full_name") or username,
        email=data.get("email") or "",
        phone=data.get("phone") or "",
        employee_code=code,
        department=department,
        hr_section=hr_section,
        work_shift=work_shift,
        permissions=perms,
        branch_access_mode=mode,
        created_by=actor,
        updated_by=actor,
    )
    if not uses_system:
        user.set_unusable_password()
        user.permissions = merge_permissions({})
        user.branch_access_mode = User.BranchAccessMode.SINGLE
        user.default_branch = None
        user.allowed_branches.clear()
        user.save(using="tenant", update_fields=["password", "permissions", "branch_access_mode", "default_branch"])
    if uses_system:
        apply_branch_access(
            user,
            mode=mode,
            branch_ids=data.get("allowed_branch_ids"),
            default_branch_id=data.get("default_branch_id"),
        )
    GlobalUsername.objects.create(username=username, tenant=tenant)
    profile, _ = EmployeeProfile.objects.using("tenant").get_or_create(user=user)
    if data.get("hire_date"):
        profile.hire_date = data["hire_date"]
        profile.save(using="tenant", update_fields=["hire_date"])
    return user


@transaction.atomic(using="tenant")
def update_employee(*, actor: User, instance: User, data: dict) -> User:
    if "full_name" in data:
        instance.full_name = data["full_name"]
    if "email" in data:
        instance.email = data["email"]
    if "phone" in data:
        instance.phone = data["phone"]
    if "is_active" in data and not instance.is_owner:
        instance.is_active = data["is_active"]
    if "department_id" in data:
        if data["department_id"]:
            try:
                instance.department = Department.objects.using("tenant").get(
                    pk=data["department_id"], is_active=True
                )
            except Department.DoesNotExist:
                raise ValidationError("الإدارة غير موجودة.")
        else:
            instance.department = None
            instance.hr_section = None
    if "hr_section_id" in data:
        if data["hr_section_id"]:
            try:
                sec = HrSection.objects.using("tenant").select_related("department").get(
                    pk=data["hr_section_id"], is_active=True
                )
            except HrSection.DoesNotExist:
                raise ValidationError("القسم الفرعي غير موجود.")
            if instance.department_id and sec.department_id != instance.department_id:
                raise ValidationError("القسم الفرعي لا يتبع إدارة الموظف.")
            instance.hr_section = sec
            if not instance.department_id:
                instance.department = sec.department
        else:
            instance.hr_section = None
    if "work_shift_id" in data:
        if data["work_shift_id"]:
            try:
                instance.work_shift = WorkShift.objects.using("tenant").get(
                    pk=data["work_shift_id"], is_active=True
                )
            except WorkShift.DoesNotExist:
                raise ValidationError("الشيفت غير موجود.")
        else:
            instance.work_shift = None
    if "permissions" in data:
        if instance.is_owner:
            instance.permissions = full_permissions()
        else:
            instance.permissions = merge_permissions(data["permissions"])
    if data.get("uses_system") is False and not instance.is_owner:
        instance.set_unusable_password()
        instance.permissions = merge_permissions({})
        instance.branch_access_mode = User.BranchAccessMode.SINGLE
        instance.default_branch = None
        instance.allowed_branches.clear()
    if data.get("password"):
        instance.set_password(data["password"])
    if not instance.is_owner and any(
        k in data
        for k in ("branch_access_mode", "default_branch_id", "allowed_branch_ids")
    ):
        mode = data.get("branch_access_mode", instance.branch_access_mode)
        branch_payload = {
            "branch_access_mode": mode,
            "default_branch_id": data.get("default_branch_id", instance.default_branch_id),
            "allowed_branch_ids": data.get("allowed_branch_ids"),
        }
        if mode == User.BranchAccessMode.SINGLE and not branch_payload["default_branch_id"]:
            raise ValidationError("اختر الفرع عند تحديد «فرع واحد».")
        if mode == User.BranchAccessMode.MULTIPLE and branch_payload["allowed_branch_ids"] is None:
            branch_payload["allowed_branch_ids"] = list(
                instance.allowed_branches.values_list("id", flat=True)
            )
        _validate_branch_access(branch_payload)
        apply_branch_access(
            instance,
            mode=mode,
            branch_ids=branch_payload.get("allowed_branch_ids"),
            default_branch_id=branch_payload.get("default_branch_id"),
        )
    instance.updated_by = actor
    instance.save(using="tenant")
    if "hire_date" in data:
        profile, _ = EmployeeProfile.objects.using("tenant").get_or_create(user=instance)
        profile.hire_date = data.get("hire_date")
        profile.save(using="tenant", update_fields=["hire_date"])
    return instance


def _normalize_weekly_schedule(raw: list | None, period_count: int = 1) -> list[dict]:
    if not raw:
        return default_weekly_schedule()
    by_day = {str(row.get("day", "")).lower(): row for row in raw if isinstance(row, dict)}
    periods = max(1, min(3, int(period_count or 1)))
    out = []
    for day in WEEKDAY_KEYS:
        row = by_day.get(day, {})
        is_off = bool(row.get("is_off"))
        p1_start = str(row.get("morning_start_time") or row.get("start_time") or "09:00")[:5]
        p1_end = str(row.get("morning_end_time") or row.get("end_time") or "17:00")[:5]
        p2_start = str(row.get("evening_start_time") or "17:00")[:5]
        p2_end = str(row.get("evening_end_time") or "21:00")[:5]
        p3_start = str(row.get("third_start_time") or "21:00")[:5]
        p3_end = str(row.get("third_end_time") or "23:00")[:5]
        evening_on = periods >= 2 and bool(row.get("evening_enabled", periods >= 2))
        third_on = periods >= 3 and bool(row.get("third_enabled", periods >= 3))
        out.append(
            {
                "day": day,
                "is_off": is_off,
                "start_time": "" if is_off else p1_start,
                "end_time": "" if is_off else p1_end,
                "morning_start_time": "" if is_off else p1_start,
                "morning_end_time": "" if is_off else p1_end,
                "evening_enabled": False if is_off else evening_on,
                "evening_start_time": "" if is_off or not evening_on else p2_start,
                "evening_end_time": "" if is_off or not evening_on else p2_end,
                "third_enabled": False if is_off else third_on,
                "third_start_time": "" if is_off or not third_on else p3_start,
                "third_end_time": "" if is_off or not third_on else p3_end,
            }
        )
    return out


def serialize_hr_section(sec: HrSection) -> dict:
    return {
        "id": str(sec.pk),
        "department_id": str(sec.department_id),
        "department_code": sec.department.code,
        "department_name": sec.department.name,
        "code": sec.code,
        "name": sec.name,
        "is_active": sec.is_active,
        "created_at": sec.created_at.isoformat(),
        "updated_at": sec.updated_at.isoformat(),
    }


def serialize_work_shift(shift: WorkShift) -> dict:
    employee_count = User.objects.using("tenant").filter(work_shift=shift, is_active=True).count()
    return {
        "id": str(shift.pk),
        "code": shift.code,
        "name": shift.name,
        "name_en": getattr(shift, "name_en", "") or "",
        "description": shift.description,
        "period_count": int(getattr(shift, "period_count", 1) or 1),
        "weekly_schedule": shift.weekly_schedule,
        "employee_count": employee_count,
        "is_active": shift.is_active,
        "created_at": shift.created_at.isoformat(),
        "updated_at": shift.updated_at.isoformat(),
    }


@transaction.atomic(using="tenant")
def create_hr_section(
    *, actor: User, department_id, name: str, code: str | None = None
) -> HrSection:
    name = name.strip()
    if not name:
        raise ValidationError("اسم القسم مطلوب.")
    try:
        dept = Department.objects.using("tenant").get(pk=department_id, is_active=True)
    except Department.DoesNotExist:
        raise ValidationError("الإدارة غير موجودة.")
    final_code = (code or next_hr_section_code(dept.pk)).strip().upper()
    if HrSection.objects.using("tenant").filter(department=dept, code=final_code).exists():
        raise ValidationError(f"كود القسم '{final_code}' مستخدم في هذه الإدارة.")
    sec = HrSection.objects.using("tenant").create(
        department=dept,
        code=final_code,
        name=name,
        created_by=actor,
        updated_by=actor,
    )
    return HrSection.objects.using("tenant").select_related("department").get(pk=sec.pk)


@transaction.atomic(using="tenant")
def update_hr_section(*, actor: User, instance: HrSection, name: str) -> HrSection:
    name = name.strip()
    if not name:
        raise ValidationError("اسم القسم مطلوب.")
    instance.name = name
    instance.updated_by = actor
    instance.save(using="tenant")
    return HrSection.objects.using("tenant").select_related("department").get(pk=instance.pk)


@transaction.atomic(using="tenant")
def create_work_shift(
    *,
    actor: User,
    name: str,
    code: str | None = None,
    description: str = "",
    name_en: str = "",
    period_count: int = 1,
    weekly_schedule: list | None = None,
) -> WorkShift:
    name = name.strip()
    if not name:
        raise ValidationError("اسم الشيفت مطلوب.")
    final_code = (code or next_work_shift_code()).strip().upper()
    if WorkShift.objects.using("tenant").filter(code=final_code).exists():
        raise ValidationError(f"كود الشيفت '{final_code}' مستخدم.")
    periods = max(1, min(3, int(period_count or 1)))
    return WorkShift.objects.using("tenant").create(
        code=final_code,
        name=name,
        name_en=(name_en or "").strip(),
        description=(description or "").strip(),
        period_count=periods,
        weekly_schedule=_normalize_weekly_schedule(weekly_schedule, periods),
        created_by=actor,
        updated_by=actor,
    )


@transaction.atomic(using="tenant")
def update_work_shift(
    *,
    actor: User,
    instance: WorkShift,
    name: str | None = None,
    name_en: str | None = None,
    description: str | None = None,
    period_count: int | None = None,
    weekly_schedule: list | None = None,
) -> WorkShift:
    if name is not None:
        name = name.strip()
        if not name:
            raise ValidationError("اسم الشيفت مطلوب.")
        instance.name = name
    if name_en is not None:
        instance.name_en = name_en.strip()
    if description is not None:
        instance.description = description.strip()
    if period_count is not None:
        instance.period_count = max(1, min(3, int(period_count)))
    if weekly_schedule is not None:
        periods = instance.period_count if period_count is None else max(1, min(3, int(period_count)))
        instance.weekly_schedule = _normalize_weekly_schedule(weekly_schedule, periods)
    instance.updated_by = actor
    instance.save(using="tenant")
    return instance


@transaction.atomic(using="tenant")
def seed_hr_org_defaults(*, actor: User | None = None) -> dict:
    """بيانات افتراضية للإدارات والأقسام والشيفتات."""
    created = {"departments": 0, "sections": 0, "shifts": 0}
    dept_specs = [
        ("001", "إدارة المبيعات"),
        ("002", "إدارة المخازن"),
        ("003", "إدارة الحسابات"),
        ("004", "إدارة المشتريات"),
    ]
    dept_by_code: dict[str, Department] = {}
    for code, name in dept_specs:
        dept, was_created = Department.objects.using("tenant").get_or_create(
            code=code,
            defaults={"name": name, "created_by": actor, "updated_by": actor},
        )
        if was_created:
            created["departments"] += 1
        dept_by_code[code] = dept

    section_specs = [
        ("002", "S-01", "قسم الاستلام"),
        ("002", "S-02", "قسم المرتجعات"),
        ("002", "S-03", "قسم الجرد"),
        ("001", "S-01", "قسم مبيعات المحل"),
        ("003", "S-01", "قسم الحسابات العامة"),
    ]
    for dept_code, sec_code, sec_name in section_specs:
        dept = dept_by_code.get(dept_code)
        if not dept:
            continue
        _, was_created = HrSection.objects.using("tenant").get_or_create(
            department=dept,
            code=sec_code,
            defaults={"name": sec_name, "created_by": actor, "updated_by": actor},
        )
        if was_created:
            created["sections"] += 1

    shift_specs = [
        ("A", "شيفت صباحي", "دوام صباحي من السبت للخميس"),
        ("B", "شيفت مسائي", "دوام مسائي"),
        ("C", "شيفت ليل", "دوام ليلي"),
    ]
    for code, name, desc in shift_specs:
        schedule = default_weekly_schedule()
        if code == "B":
            for row in schedule:
                if not row["is_off"]:
                    row["start_time"] = "14:00"
                    row["end_time"] = "22:00"
        if code == "C":
            for row in schedule:
                if not row["is_off"]:
                    row["start_time"] = "22:00"
                    row["end_time"] = "06:00"
        _, was_created = WorkShift.objects.using("tenant").get_or_create(
            code=code,
            defaults={
                "name": name,
                "description": desc,
                "weekly_schedule": schedule,
                "created_by": actor,
                "updated_by": actor,
            },
        )
        if was_created:
            created["shifts"] += 1
    return created


@transaction.atomic(using="tenant")
def create_department(
    *,
    actor: User,
    name: str,
    code: str | None = None,
    manager_name: str = "",
    operational_budget=0,
    description: str = "",
) -> Department:
    name = name.strip()
    if not name:
        raise ValidationError("اسم الإدارة مطلوب.")
    final_code = (code or next_department_code()).strip()
    if Department.objects.using("tenant").filter(code=final_code).exists():
        raise ValidationError(f"كود الإدارة '{final_code}' مستخدم بالفعل.")
    return Department.objects.using("tenant").create(
        code=final_code,
        name=name,
        manager_name=(manager_name or "").strip(),
        operational_budget=operational_budget or 0,
        description=(description or "").strip(),
        created_by=actor,
        updated_by=actor,
    )


@transaction.atomic(using="tenant")
def update_department(
    *,
    actor: User,
    instance: Department,
    name: str,
    manager_name: str | None = None,
    operational_budget=None,
    description: str | None = None,
) -> Department:
    name = name.strip()
    if not name:
        raise ValidationError("اسم الإدارة مطلوب.")
    instance.name = name
    if manager_name is not None:
        instance.manager_name = (manager_name or "").strip()
    if operational_budget is not None:
        instance.operational_budget = operational_budget or 0
    if description is not None:
        instance.description = (description or "").strip()
    instance.updated_by = actor
    instance.save(using="tenant")
    return instance
