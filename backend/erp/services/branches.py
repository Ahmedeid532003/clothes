"""الفرع = منفذ البيع — مخزن بيع واحد يُنشأ تلقائياً لكل فرع."""

from __future__ import annotations

from django.utils.text import slugify

from erp.models import Branch, BranchWarehouse, Warehouse
from erp.services import catalog as catalog_service
from tenancy.db_alias import erp_database_alias


def _db() -> str:
    return erp_database_alias()


def is_sale_outlet_warehouse(warehouse_id) -> bool:
    return BranchWarehouse.objects.using(_db()).filter(warehouse_id=warehouse_id).exists()


def branch_for_sale_warehouse(warehouse_id):
    link = (
        BranchWarehouse.objects.using(_db())
        .filter(warehouse_id=warehouse_id)
        .select_related("branch")
        .first()
    )
    return link.branch if link else None


def ensure_branch_sale_warehouse(branch: Branch) -> Warehouse:
    """
    يضمن مخزن بيع واحد (منفذ = الفرع) مربوطاً بـ BranchWarehouse.is_default.
    لا يُنشأ من الواجهة يدوياً.
    """
    link = (
        BranchWarehouse.objects.using(_db())
        .filter(branch=branch, is_default=True)
        .select_related("warehouse")
        .first()
    )
    if link and link.warehouse.is_active:
        wh = link.warehouse
        if wh.primary_branch_id != branch.id:
            wh.primary_branch = branch
            wh.save(using=_db(), update_fields=["primary_branch", "updated_at"])
        return wh

    wh = (
        Warehouse.objects.using(_db())
        .filter(primary_branch=branch, is_active=True)
        .first()
    )
    if not wh:
        base = slugify(branch.code or branch.name_ar) or "branch"
        code = f"pos-{base}"[:50]
        if Warehouse.objects.using(_db()).filter(code=code).exists():
            code = catalog_service._next_code("POS", Warehouse)
        wh = Warehouse.objects.using(_db()).create(
            code=code,
            name_ar=f"منفذ بيع — {branch.name_ar}",
            name_en=f"POS — {branch.name_en or branch.name_ar}",
            primary_branch=branch,
            is_active=True,
        )

    BranchWarehouse.objects.using(_db()).filter(branch=branch).exclude(
        warehouse=wh
    ).update(is_default=False)
    BranchWarehouse.objects.using(_db()).update_or_create(
        branch=branch,
        warehouse=wh,
        defaults={"is_default": True},
    )
    return wh


def sync_all_branch_sale_warehouses() -> int:
    count = 0
    for branch in Branch.objects.using(_db()).filter(is_active=True):
        ensure_branch_sale_warehouse(branch)
        count += 1
    return count
