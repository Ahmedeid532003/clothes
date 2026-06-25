"""شجرة الحسابات — هيكل هرمي، بذور افتراضية، وسياسات الحذف."""

from __future__ import annotations

import re

from django.db import transaction
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from erp.accounting_models import (
    GeneralExpenseType,
    GlAccount,
    JournalLine,
    Treasury,
)
from erp.accounting_models import FixedAsset

_USING = "tenant"
_TYPE_ROOT: dict[str, str] = {
    GlAccount.AccountType.ASSET: "1000",
    GlAccount.AccountType.LIABILITY: "2000",
    GlAccount.AccountType.EQUITY: "3000",
    GlAccount.AccountType.REVENUE: "4000",
    GlAccount.AccountType.EXPENSE: "5000",
}


def _normalize_segment(raw: str, fallback: str = "") -> str:
    seg = (raw or "").strip().upper()
    seg = re.sub(r"[^A-Z0-9]", "", seg)
    if seg:
        return seg[:12]
    slug = slugify(fallback, allow_unicode=False) or "X"
    return re.sub(r"[^A-Z0-9]", "", slug.upper())[:6] or "X"


def _build_tree_path(parent: GlAccount | None, node_id) -> str:
    if not parent:
        return str(node_id)
    base = parent.tree_path or str(parent.pk)
    return f"{base}/{node_id}"


def account_has_movements(account_id) -> bool:
    if JournalLine.objects.using(_USING).filter(gl_account_id=account_id).exists():
        return True
    if GeneralExpenseType.objects.using(_USING).filter(gl_account_id=account_id, is_active=True).exists():
        return True
    if Treasury.objects.using(_USING).filter(gl_account_id=account_id, is_active=True).exists():
        return True
    if FixedAsset.objects.using(_USING).filter(
        gl_asset_id=account_id
    ).exists() or FixedAsset.objects.using(_USING).filter(
        gl_accumulated_id=account_id
    ).exists() or FixedAsset.objects.using(_USING).filter(
        gl_expense_id=account_id
    ).exists():
        return True
    return False


def _serialize(row: GlAccount, children_count: int = 0) -> dict:
    return {
        "id": str(row.pk),
        "code": row.code,
        "name_ar": row.name_ar,
        "name_en": row.name_en,
        "account_type": row.account_type,
        "parent": str(row.parent_id) if row.parent_id else None,
        "parent_code": row.parent.code if row.parent else None,
        "parent_name": row.parent.name_ar if row.parent else None,
        "code_segment": row.code_segment,
        "level": row.level,
        "tree_path": row.tree_path,
        "path_label": _path_label(row),
        "cost_center": str(row.cost_center_id) if row.cost_center_id else None,
        "cost_center_name": row.cost_center.name_ar if row.cost_center else None,
        "branch": str(row.branch_id) if row.branch_id else None,
        "branch_name": (
            (row.branch.name_ar or row.branch.name_en or row.branch.code) if row.branch else None
        ),
        "is_system": row.is_system,
        "is_active": row.is_active,
        "has_movements": account_has_movements(row.pk),
        "children_count": children_count,
    }


def _path_label(row: GlAccount) -> str:
    if not row.parent_id:
        return row.name_ar
    parent = row.parent
    parts = [row.name_ar]
    while parent:
        parts.insert(0, parent.name_ar)
        parent = parent.parent
    return " / ".join(parts)


@transaction.atomic(using=_USING)
def ensure_default_chart():
    """بذور شجرة حسابات قياسية للتجزئة."""
    if GlAccount.objects.using(_USING).filter(is_system=True).exists():
        return

    def _acc(code, name_ar, acc_type, parent=None, seg=""):
        row, _ = GlAccount.objects.using(_USING).get_or_create(
            code=code,
            defaults={
                "name_ar": name_ar,
                "name_en": name_ar,
                "account_type": acc_type,
                "parent": parent,
                "code_segment": seg,
                "level": (parent.level + 1) if parent else 0,
                "is_system": True,
                "is_active": True,
            },
        )
        row.tree_path = _build_tree_path(parent, row.pk)
        row.save(using=_USING, update_fields=["tree_path", "level", "parent", "account_type"])
        return row

    roots = {
        "asset": _acc("1000", "الأصول", GlAccount.AccountType.ASSET),
        "liab": _acc("2000", "الالتزامات", GlAccount.AccountType.LIABILITY),
        "equity": _acc("3000", "حقوق الملكية", GlAccount.AccountType.EQUITY),
        "revenue": _acc("4000", "الإيرادات", GlAccount.AccountType.REVENUE),
        "expense": _acc("5000", "المصروفات", GlAccount.AccountType.EXPENSE),
    }
    cash = _acc("1100", "خزنة", GlAccount.AccountType.ASSET, roots["asset"], "CASH")
    _acc("1110", "بنك", GlAccount.AccountType.ASSET, roots["asset"], "BANK")
    _acc("1120", "محفظة إلكترونية", GlAccount.AccountType.ASSET, roots["asset"], "EWLT")
    _acc("1200", "عملاء", GlAccount.AccountType.ASSET, roots["asset"], "AR")
    _acc("1300", "مخزون", GlAccount.AccountType.ASSET, roots["asset"], "INV")
    _acc("1500", "أصول ثابتة", GlAccount.AccountType.ASSET, roots["asset"], "FA")
    _acc("1590", "مجمع الإهلاك", GlAccount.AccountType.ASSET, roots["asset"], "ADEP")
    _acc("2100", "موردين", GlAccount.AccountType.LIABILITY, roots["liab"], "AP")
    _acc("2200", "قروض", GlAccount.AccountType.LIABILITY, roots["liab"], "LOAN")
    _acc("3100", "رأس المال", GlAccount.AccountType.EQUITY, roots["equity"], "CAP")
    _acc("4100", "مبيعات", GlAccount.AccountType.REVENUE, roots["revenue"], "SALE")
    _acc("5140", "رواتب وأجور", GlAccount.AccountType.EXPENSE, roots["expense"], "PAY")
    _acc("5120", "كهرباء ومرافق", GlAccount.AccountType.EXPENSE, roots["expense"], "UTIL")
    _acc("5200", "مصروف الإهلاك", GlAccount.AccountType.EXPENSE, roots["expense"], "DEP")
    return cash


def suggest_chart_code(*, parent_id=None, account_type: str = "", code_segment: str = "", name_ar: str = "") -> str:
    ensure_default_chart()
    parent = None
    if parent_id:
        parent = GlAccount.objects.using(_USING).get(pk=parent_id, is_active=True)
    seg = _normalize_segment(code_segment, name_ar)
    if not parent:
        root = _TYPE_ROOT.get(account_type, "9000")
        qs = GlAccount.objects.using(_USING).filter(is_active=True, parent__isnull=True, account_type=account_type)
        n = qs.count() + 1
        return f"{int(root) + n - 1:04d}" if n > 1 else root
    siblings = GlAccount.objects.using(_USING).filter(is_active=True, parent_id=parent.pk).count() + 1
    if parent.level == 0:
        return f"{parent.code[:1]}{int(parent.code[1:]) + siblings:03d}"
    base = parent.code.split("-")[0] if "-" in parent.code else parent.code
    return f"{base}-{seg or siblings:02d}" if seg else f"{base}{siblings:02d}"


def list_chart_flat(*, account_type: str | None = None) -> list[dict]:
    ensure_default_chart()
    qs = GlAccount.objects.using(_USING).filter(is_active=True).select_related(
        "parent", "cost_center", "branch"
    )
    if account_type:
        qs = qs.filter(account_type=account_type)
    rows = list(qs.order_by("tree_path", "code"))
    child_counts: dict = {}
    for r in rows:
        if r.parent_id:
            child_counts[r.parent_id] = child_counts.get(r.parent_id, 0) + 1
    by_id = {r.pk: r for r in rows}
    for r in rows:
        r.parent = by_id.get(r.parent_id) if r.parent_id else None
    return [_serialize(r, child_counts.get(r.pk, 0)) for r in rows]


@transaction.atomic(using=_USING)
def create_chart_account(*, data: dict) -> GlAccount:
    name_ar = (data.get("name_ar") or "").strip()
    if not name_ar:
        raise ValidationError("اسم الحساب مطلوب.")
    parent = None
    if data.get("parent"):
        parent = GlAccount.objects.using(_USING).get(pk=data["parent"], is_active=True)
    acc_type = data.get("account_type") or (parent.account_type if parent else GlAccount.AccountType.ASSET)
    code = (data.get("code") or "").strip() or suggest_chart_code(
        parent_id=parent.pk if parent else None,
        account_type=acc_type,
        code_segment=data.get("code_segment", ""),
        name_ar=name_ar,
    )
    if GlAccount.objects.using(_USING).filter(code=code).exists():
        raise ValidationError("كود الحساب مستخدم.")
    row = GlAccount.objects.using(_USING).create(
        code=code,
        name_ar=name_ar,
        name_en=(data.get("name_en") or "").strip() or name_ar,
        account_type=acc_type,
        parent=parent,
        code_segment=_normalize_segment(data.get("code_segment", ""), name_ar),
        level=(parent.level + 1) if parent else 0,
        cost_center_id=data.get("cost_center") or None,
        branch_id=data.get("branch") or None,
        is_system=False,
        is_active=True,
    )
    row.tree_path = _build_tree_path(parent, row.pk)
    row.save(using=_USING, update_fields=["tree_path"])
    return row


@transaction.atomic(using=_USING)
def update_chart_account(row: GlAccount, *, data: dict) -> GlAccount:
    if row.is_system and data.get("code"):
        raise ValidationError("لا يمكن تغيير كود حساب النظام.")
    for field in ("name_ar", "name_en"):
        if field in data:
            setattr(row, field, (data[field] or "").strip())
    if "cost_center" in data:
        row.cost_center_id = data["cost_center"] or None
    if "branch" in data:
        row.branch_id = data["branch"] or None
    row.save(using=_USING)
    return row


@transaction.atomic(using=_USING)
def soft_delete_chart_account(row: GlAccount) -> None:
    if row.is_system:
        raise ValidationError("لا يمكن حذف حسابات النظام الافتراضية.")
    if account_has_movements(row.pk):
        raise ValidationError("لا يمكن حذف حساب مرتبط بحركات محاسبية.")
    if GlAccount.objects.using(_USING).filter(parent_id=row.pk, is_active=True).exists():
        raise ValidationError("لا يمكن حذف حساب له فروع نشطة.")
    row.is_active = False
    row.save(using=_USING, update_fields=["is_active"])


def list_gl_accounts_simple() -> list[dict]:
    """قائمة مختصرة لربط الحقول (كل الأنواع)."""
    ensure_default_chart()
    return [
        {
            "id": str(a.pk),
            "code": a.code,
            "name_ar": a.name_ar,
            "name_en": a.name_en,
            "account_type": a.account_type,
            "parent": str(a.parent_id) if a.parent_id else None,
        }
        for a in GlAccount.objects.using(_USING).filter(is_active=True).order_by("code")
    ]
