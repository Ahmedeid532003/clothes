"""خدمات الحسابات — أنواع المصروفات العامة والتكويد الهرمي."""

from __future__ import annotations

import re

from django.db import transaction
from django.db.utils import OperationalError, ProgrammingError
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from erp.accounting_models import CostCenter, GeneralExpenseType, GlAccount

_CODE_RE = re.compile(r"^[A-Z0-9][A-Z0-9\-]{1,38}$")


def _using():
    return "tenant"


def expense_types_tables_ready() -> bool:
    try:
        GeneralExpenseType.objects.using(_using()).exists()
        return True
    except (ProgrammingError, OperationalError):
        return False


def _normalize_segment(raw: str, fallback_name: str = "") -> str:
    seg = (raw or "").strip().upper()
    seg = re.sub(r"[^A-Z0-9]", "", seg)
    if seg:
        return seg[:12]
    slug = slugify(fallback_name, allow_unicode=False) or "X"
    return re.sub(r"[^A-Z0-9]", "", slug.upper())[:6] or "X"


def _siblings_seq(parent_id, segment: str, exclude_id=None) -> int:
    qs = GeneralExpenseType.objects.using(_using()).filter(is_active=True, parent_id=parent_id)
    if segment:
        qs = qs.filter(code_segment=segment)
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return qs.count() + 1


def suggest_expense_type_code(
    *,
    parent_id=None,
    code_segment: str = "",
    name_ar: str = "",
) -> str:
    """معاينة الكود التالي دون حفظ."""
    parent = None
    if parent_id:
        parent = GeneralExpenseType.objects.using(_using()).get(pk=parent_id, is_active=True)
    seg = _normalize_segment(code_segment, name_ar)
    seq = _siblings_seq(parent.pk if parent else None, seg)
    if not parent:
        return f"EXP-{seq:03d}"
    if parent.level == 0:
        return f"EXP-{seg}-{seq:03d}"
    return f"{parent.code}-{seg}-{seq:03d}"


def _build_tree_path(parent: GeneralExpenseType | None, node_id) -> str:
    if not parent:
        return str(node_id)
    base = parent.tree_path or str(parent.pk)
    return f"{base}/{node_id}"


def _validate_parent_chain(parent: GeneralExpenseType | None, node_id=None):
    if not parent:
        return
    cursor = parent
    depth = 0
    while cursor:
        if node_id and cursor.pk == node_id:
            raise ValidationError("لا يمكن جعل النوع تابعاً لنفسه أو لأحد فروعه.")
        cursor = cursor.parent
        depth += 1
        if depth > 50:
            raise ValidationError("عمق التصنيف كبير جداً.")


def _assign_code(
    *,
    parent: GeneralExpenseType | None,
    manual_code: str,
    code_segment: str,
    name_ar: str,
) -> str:
    code = (manual_code or "").strip().upper()
    if code:
        if not _CODE_RE.match(code):
            raise ValidationError("صيغة الكود غير صالحة — استخدم أحرفاً وأرقاماً وشرطات فقط.")
        if GeneralExpenseType.objects.using(_using()).filter(code=code).exists():
            raise ValidationError("كود المصروف مستخدم بالفعل.")
        return code
    return suggest_expense_type_code(
        parent_id=str(parent.pk) if parent else None,
        code_segment=code_segment,
        name_ar=name_ar,
    )


@transaction.atomic(using=_using())
def create_expense_type(*, data: dict) -> GeneralExpenseType:
    name_ar = (data.get("name_ar") or "").strip()
    if not name_ar:
        raise ValidationError("اسم المصروف مطلوب.")

    parent = None
    parent_id = data.get("parent")
    if parent_id:
        parent = GeneralExpenseType.objects.using(_using()).get(pk=parent_id, is_active=True)
        _validate_parent_chain(parent)

    seg = _normalize_segment(data.get("code_segment") or "", name_ar)
    if GeneralExpenseType.objects.using(_using()).filter(
        parent=parent, name_ar=name_ar, is_active=True
    ).exists():
        raise ValidationError("يوجد نوع مصروف بنفس الاسم تحت هذا التصنيف.")

    code = _assign_code(
        parent=parent,
        manual_code=data.get("code") or "",
        code_segment=seg,
        name_ar=name_ar,
    )

    level = (parent.level + 1) if parent else 0
    node_id = GeneralExpenseType.objects.using(_using()).create(
        code=code,
        name_ar=name_ar,
        name_en=(data.get("name_en") or name_ar).strip(),
        parent=parent,
        code_segment=seg,
        level=level,
        tree_path="",
        gl_account_id=data.get("gl_account") or None,
        cost_center_id=data.get("cost_center") or None,
        branch_id=data.get("branch") or None,
        department_id=data.get("department") or None,
        notes=(data.get("notes") or "").strip(),
        is_active=data.get("is_active", True),
    )
    node_id.tree_path = _build_tree_path(parent, node_id.pk)
    node_id.save(using=_using(), update_fields=["tree_path"])
    return node_id


@transaction.atomic(using=_using())
def update_expense_type(instance: GeneralExpenseType, *, data: dict) -> GeneralExpenseType:
    name_ar = data.get("name_ar")
    if name_ar is not None:
        name_ar = name_ar.strip()
        if not name_ar:
            raise ValidationError("اسم المصروف مطلوب.")
        if (
            GeneralExpenseType.objects.using(_using())
            .filter(parent_id=instance.parent_id, name_ar=name_ar, is_active=True)
            .exclude(pk=instance.pk)
            .exists()
        ):
            raise ValidationError("يوجد نوع مصروف بنفس الاسم تحت هذا التصنيف.")
        instance.name_ar = name_ar

    if "name_en" in data:
        instance.name_en = (data.get("name_en") or instance.name_ar).strip()

    new_parent_id = data.get("parent") if "parent" in data else instance.parent_id
    if "parent" in data:
        new_parent = None
        if new_parent_id:
            new_parent = GeneralExpenseType.objects.using(_using()).get(
                pk=new_parent_id, is_active=True
            )
            _validate_parent_chain(new_parent, instance.pk)
        if new_parent_id != instance.parent_id:
            raise ValidationError(
                "تغيير التصنيف الأب غير مدعوم حالياً — أنشئ نوعاً جديداً أو أوقف القديم."
            )

    if "code_segment" in data:
        instance.code_segment = _normalize_segment(
            data.get("code_segment") or "", instance.name_ar
        )

    if "code" in data and (data.get("code") or "").strip():
        new_code = (data["code"] or "").strip().upper()
        if new_code != instance.code:
            if not _CODE_RE.match(new_code):
                raise ValidationError("صيغة الكود غير صالحة.")
            if (
                GeneralExpenseType.objects.using(_using())
                .filter(code=new_code)
                .exclude(pk=instance.pk)
                .exists()
            ):
                raise ValidationError("كود المصروف مستخدم بالفعل.")
            instance.code = new_code

    if "gl_account" in data:
        instance.gl_account_id = data.get("gl_account") or None
    if "cost_center" in data:
        instance.cost_center_id = data.get("cost_center") or None
    if "branch" in data:
        instance.branch_id = data.get("branch") or None
    if "department" in data:
        instance.department_id = data.get("department") or None
    if "notes" in data:
        instance.notes = (data.get("notes") or "").strip()
    if "is_active" in data:
        instance.is_active = bool(data["is_active"])

    instance.save(using=_using())
    return instance


def soft_delete_expense_type(instance: GeneralExpenseType):
    if (
        GeneralExpenseType.objects.using(_using())
        .filter(parent=instance, is_active=True)
        .exists()
    ):
        raise ValidationError("لا يمكن إيقاف نوع له أنواع فرعية نشطة — أوقف الفروع أولاً.")
    instance.is_active = False
    instance.save(using=_using(), update_fields=["is_active", "updated_at"])
    return instance


def list_expense_types_flat() -> list[dict]:
    if not expense_types_tables_ready():
        return []
    rows = list(
        GeneralExpenseType.objects.using(_using())
        .select_related("gl_account", "cost_center", "branch", "department", "parent")
        .filter(is_active=True)
        .order_by("tree_path", "code")
    )
    all_nodes = {
        r.pk: r
        for r in GeneralExpenseType.objects.using(_using()).only(
            "id", "name_ar", "parent_id"
        )
    }
    child_counts: dict = {}
    for row in rows:
        if row.parent_id:
            child_counts[row.parent_id] = child_counts.get(row.parent_id, 0) + 1

    def path_label(node: GeneralExpenseType) -> str:
        names = [node.name_ar]
        pid = node.parent_id
        guard = 0
        while pid and pid in all_nodes and guard < 40:
            parent = all_nodes[pid]
            names.insert(0, parent.name_ar)
            pid = parent.parent_id
            guard += 1
        return " › ".join(names)

    return [
        _serialize_expense_type(
            row,
            child_counts.get(row.pk, 0),
            path_label=path_label(row),
        )
        for row in rows
    ]


def _serialize_expense_type(
    row: GeneralExpenseType,
    children_count: int = 0,
    *,
    path_label: str | None = None,
) -> dict:

    return {
        "id": str(row.pk),
        "code": row.code,
        "name_ar": row.name_ar,
        "name_en": row.name_en,
        "parent": str(row.parent_id) if row.parent_id else None,
        "parent_code": row.parent.code if row.parent else None,
        "parent_name": row.parent.name_ar if row.parent else None,
        "code_segment": row.code_segment,
        "level": row.level,
        "tree_path": row.tree_path,
        "path_label": path_label or row.name_ar,
        "gl_account": str(row.gl_account_id) if row.gl_account_id else None,
        "gl_account_code": row.gl_account.code if row.gl_account else None,
        "gl_account_name": row.gl_account.name_ar if row.gl_account else None,
        "cost_center": str(row.cost_center_id) if row.cost_center_id else None,
        "cost_center_code": row.cost_center.code if row.cost_center else None,
        "cost_center_name": row.cost_center.name_ar if row.cost_center else None,
        "branch": str(row.branch_id) if row.branch_id else None,
        "branch_name": (
            (row.branch.name_ar or row.branch.name_en or row.branch.code)
            if row.branch
            else None
        ),
        "department": str(row.department_id) if row.department_id else None,
        "department_name": row.department.name if row.department else None,
        "notes": row.notes,
        "is_active": row.is_active,
        "children_count": children_count,
    }


_EXPENSE_TYPE_PRESETS = (
    ("NET", "إنترنت", "5120"),
    ("RENT", "إيجارات", "5130"),
    ("SHIP", "شحن", "5150"),
    ("ELEC", "كهرباء", "5120"),
    ("WATER", "مياه", "5120"),
    ("MNT", "صيانة", "5110"),
    ("HOSP", "ضيافة", "5100"),
    ("FUEL", "وقود", "5150"),
    ("OFF", "أدوات مكتبية", "5100"),
    ("OTH", "مصروفات تشغيلية أخرى", "5100"),
)


def ensure_default_expense_types():
    """بذور بنود المصروفات الشائعة مع ربط حسابات افتراضية."""
    if not expense_types_tables_ready():
        return
    try:
        ensure_default_gl_accounts()
    except (ProgrammingError, OperationalError, ValidationError):
        return
    try:
        if GeneralExpenseType.objects.using(_using()).filter(is_active=True).exists():
            return
    except (ProgrammingError, OperationalError):
        return
    gl_map: dict[str, object] = {}
    try:
        gl_map = {
            g.code: g.pk
            for g in GlAccount.objects.using(_using()).filter(
                is_active=True, account_type=GlAccount.AccountType.EXPENSE
            )
        }
    except (ProgrammingError, OperationalError):
        gl_map = {}
    for segment, name_ar, gl_code in _EXPENSE_TYPE_PRESETS:
        gl_id = gl_map.get(gl_code)
        try:
            create_expense_type(
                data={
                    "name_ar": name_ar,
                    "name_en": name_ar,
                    "code_segment": segment,
                    "gl_account": str(gl_id) if gl_id else None,
                }
            )
        except (ValidationError, ProgrammingError, OperationalError):
            continue


def ensure_default_gl_accounts():
    """بذور أولية لحسابات مصروفات إن لم تُعرّف."""
    defaults = [
        ("5100", "مصروفات تشغيل", GlAccount.AccountType.EXPENSE),
        ("5110", "مصروفات صيانة", GlAccount.AccountType.EXPENSE),
        ("5120", "مرافق (كهرباء/مياه/نت)", GlAccount.AccountType.EXPENSE),
        ("5130", "إيجارات", GlAccount.AccountType.EXPENSE),
        ("5140", "رواتب وأجور", GlAccount.AccountType.EXPENSE),
        ("5150", "انتقالات وشحن", GlAccount.AccountType.EXPENSE),
    ]
    for code, name_ar, acc_type in defaults:
        GlAccount.objects.using(_using()).get_or_create(
            code=code,
            defaults={
                "name_ar": name_ar,
                "name_en": name_ar,
                "account_type": acc_type,
                "is_active": True,
            },
        )


def list_gl_accounts() -> list[dict]:
    from erp.services.accounting_chart import list_gl_accounts_simple

    return list_gl_accounts_simple()


def list_cost_centers() -> list[dict]:
    return [
        {
            "id": str(c.pk),
            "code": c.code,
            "name_ar": c.name_ar,
            "name_en": c.name_en,
            "branch": str(c.branch_id) if c.branch_id else None,
            "branch_name": (
                (c.branch.name_ar or c.branch.name_en or c.branch.code) if c.branch else None
            ),
        }
        for c in CostCenter.objects.using(_using())
        .select_related("branch")
        .filter(is_active=True)
        .order_by("code")
    ]


def create_cost_center(*, name_ar: str, code: str | None = None, branch_id=None) -> CostCenter:
    name_ar = name_ar.strip()
    if not name_ar:
        raise ValidationError("الاسم مطلوب.")
    final = (code or "").strip().upper() or _next_cost_center_code()
    if CostCenter.objects.using(_using()).filter(code=final).exists():
        raise ValidationError("الكود مستخدم.")
    return CostCenter.objects.using(_using()).create(
        code=final,
        name_ar=name_ar,
        name_en=name_ar,
        branch_id=branch_id or None,
    )


def _next_cost_center_code() -> str:
    existing = (
        CostCenter.objects.using(_using())
        .filter(code__startswith="CC-")
        .order_by("-code")
        .values_list("code", flat=True)
        .first()
    )
    n = 1
    if existing:
        try:
            n = int(str(existing).split("-")[-1]) + 1
        except ValueError:
            n = CostCenter.objects.using(_using()).count() + 1
    return f"CC-{n:03d}"
