"""حركات المخزون: تحويل، هالك."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from erp.branch_access import branches_for_user, user_can_access_branch
from erp.branch_context import get_branch_sale_warehouse
from erp.models import Branch, InventorySettings
from erp.services import branches as branch_service
from erp.permissions import can_perform_action
from erp.product_models import (
    ProductVariant,
    StockAddition,
    StockAdditionLine,
    StockBalance,
    StockDisbursement,
    StockDisbursementLine,
    StockScrap,
    StockScrapLine,
    StockTransfer,
    StockTransferLine,
)
from erp.services import catalog as catalog_service


def _adjust_balance(warehouse_id, variant_id, delta: Decimal):
    bal, _ = StockBalance.objects.using("tenant").select_for_update().get_or_create(
        warehouse_id=warehouse_id,
        variant_id=variant_id,
        defaults={"quantity": Decimal("0")},
    )
    bal.quantity = (bal.quantity or Decimal("0")) + delta
    if bal.quantity < 0:
        raise ValidationError("الكمية غير كافية في المخزن المصدر.")
    bal.save(using="tenant", update_fields=["quantity"])
    return bal


def get_inventory_settings() -> InventorySettings:
    settings, _ = InventorySettings.objects.using("tenant").get_or_create(pk=1)
    return settings


def user_can_approve_transfer(user) -> bool:
    if getattr(user, "is_owner", False):
        return True
    return can_perform_action(user, "stock-transfers", "approve")


def _branch_sale_warehouse_id(branch_id) -> UUID:
    branch = Branch.objects.using("tenant").get(pk=branch_id, is_active=True)
    warehouse = get_branch_sale_warehouse(branch)
    return warehouse.id


def resolve_transfer_warehouses(*, data: dict, user) -> dict:
    """يحوّل نوع التحويل إلى مخازن فعلية مع التحقق من صلاحية الفروع."""
    ttype = data.get("transfer_type", StockTransfer.TransferType.WAREHOUSE_WAREHOUSE)
    from_branch_id = data.get("from_branch")
    to_branch_id = data.get("to_branch")

    if ttype == StockTransfer.TransferType.WAREHOUSE_WAREHOUSE:
        from_wh = data.get("from_warehouse")
        to_wh = data.get("to_warehouse")
        if not from_wh or not to_wh:
            raise ValidationError("اختر المخزن المصدر والوجهة.")
        from_branch_id = None
        to_branch_id = None

    elif ttype == StockTransfer.TransferType.WAREHOUSE_BRANCH:
        from_wh = data.get("from_warehouse")
        to_branch_id = data.get("to_branch")
        if not from_wh or not to_branch_id:
            raise ValidationError("اختر المخزن ومنفذ البيع (الفرع) الوجهة.")
        if not user_can_access_branch(user, to_branch_id):
            raise PermissionDenied("ليس لديك صلاحية التحويل إلى هذا الفرع.")
        to_wh = _branch_sale_warehouse_id(to_branch_id)
        from_branch_id = None

    elif ttype == StockTransfer.TransferType.BRANCH_BRANCH:
        from_branch_id = data.get("from_branch")
        to_branch_id = data.get("to_branch")
        if not from_branch_id or not to_branch_id:
            raise ValidationError("اختر فرع المصدر وفرع الوجهة.")
        if str(from_branch_id) == str(to_branch_id):
            raise ValidationError("فرع المصدر والوجهة يجب أن يكونا مختلفين.")
        for bid in (from_branch_id, to_branch_id):
            if not user_can_access_branch(user, bid):
                raise PermissionDenied("ليس لديك صلاحية التحويل بين هذين الفرعين.")
        from_wh = _branch_sale_warehouse_id(from_branch_id)
        to_wh = _branch_sale_warehouse_id(to_branch_id)

    else:
        raise ValidationError("نوع التحويل غير معروف.")

    if str(from_wh) == str(to_wh):
        raise ValidationError("المصدر والوجهة يجب أن يكونا مختلفين.")

    return {
        "transfer_type": ttype,
        "from_warehouse": from_wh,
        "to_warehouse": to_wh,
        "from_branch": from_branch_id,
        "to_branch": to_branch_id,
    }


def transfer_options(*, user) -> dict:
    settings = get_inventory_settings()
    from erp.models import Warehouse

    warehouses = []
    for wh in Warehouse.objects.using("tenant").filter(is_active=True).order_by("code"):
        warehouses.append(
            {
                "id": str(wh.id),
                "code": wh.code,
                "name_ar": wh.name_ar,
                "is_branch_sale": branch_service.is_sale_outlet_warehouse(wh.id),
            }
        )

    branches = []
    for branch in branches_for_user(user).order_by("code"):
        try:
            sale_wh = get_branch_sale_warehouse(branch)
        except ValidationError:
            continue
        branches.append(
            {
                "id": str(branch.id),
                "code": branch.code,
                "name_ar": branch.name_ar,
                "sale_warehouse_id": str(sale_wh.id),
                "sale_warehouse_name": sale_wh.name_ar,
            }
        )

    return {
        "transfer_types": [
            {"key": StockTransfer.TransferType.WAREHOUSE_WAREHOUSE, "label_ar": "مخزن → مخزن"},
            {"key": StockTransfer.TransferType.WAREHOUSE_BRANCH, "label_ar": "مخزن → منفذ بيع"},
            {"key": StockTransfer.TransferType.BRANCH_BRANCH, "label_ar": "منفذ بيع → منفذ بيع"},
        ],
        "warehouses": warehouses,
        "branches": branches,
        "transfer_requires_approval": settings.transfer_requires_approval,
        "can_approve": user_can_approve_transfer(user),
    }


@transaction.atomic(using="tenant")
def create_transfer(*, data: dict, user) -> StockTransfer:
    lines_data = data.get("lines") or []
    if not lines_data:
        raise ValidationError("أضف بندًا واحدًا على الأقل.")

    resolved = resolve_transfer_warehouses(data=data, user=user)
    settings = get_inventory_settings()
    requires_approval = data.get("requires_approval")
    if requires_approval is None:
        requires_approval = settings.transfer_requires_approval

    code = (data.get("code") or "").strip() or catalog_service._next_code("TR", StockTransfer)
    transfer = StockTransfer.objects.using("tenant").create(
        code=code,
        transfer_type=resolved["transfer_type"],
        from_warehouse_id=resolved["from_warehouse"],
        to_warehouse_id=resolved["to_warehouse"],
        from_branch_id=resolved["from_branch"],
        to_branch_id=resolved["to_branch"],
        requires_approval=bool(requires_approval),
        notes=(data.get("notes") or "").strip(),
        status=StockTransfer.Status.DRAFT,
        created_by=user,
    )
    for row in lines_data:
        StockTransferLine.objects.using("tenant").create(
            transfer=transfer,
            variant_id=row["variant"],
            quantity=Decimal(str(row["quantity"])),
        )
    return transfer


@transaction.atomic(using="tenant")
def submit_transfer(transfer_id) -> StockTransfer:
    transfer = StockTransfer.objects.using("tenant").select_for_update().get(pk=transfer_id)
    if transfer.status != StockTransfer.Status.DRAFT:
        raise ValidationError("لا يمكن إرسال هذا الإذن.")
    if not transfer.requires_approval:
        raise ValidationError("هذا الإذن لا يحتاج موافقة — اعتمده مباشرة.")
    transfer.status = StockTransfer.Status.PENDING
    transfer.save(using="tenant", update_fields=["status"])
    return transfer


@transaction.atomic(using="tenant")
def approve_transfer(transfer_id, user, *, skip_permission: bool = False) -> StockTransfer:
    transfer = (
        StockTransfer.objects.using("tenant")
        .select_for_update()
        .prefetch_related("lines")
        .get(pk=transfer_id)
    )
    if transfer.status not in (
        StockTransfer.Status.DRAFT,
        StockTransfer.Status.PENDING,
    ):
        raise ValidationError("الإذن معتمد أو ملغى بالفعل.")

    if (
        not skip_permission
        and transfer.requires_approval
        and not user_can_approve_transfer(user)
    ):
        raise PermissionDenied("ليس لديك صلاحية اعتماد إذونات التحويل.")

    for line in transfer.lines.all():
        qty = line.quantity
        _adjust_balance(transfer.from_warehouse_id, line.variant_id, -qty)
        _adjust_balance(transfer.to_warehouse_id, line.variant_id, qty)

    transfer.status = StockTransfer.Status.APPROVED
    transfer.approved_by = user
    transfer.approved_at = timezone.now()
    transfer.save(
        using="tenant",
        update_fields=["status", "approved_by", "approved_at"],
    )
    return transfer


@transaction.atomic(using="tenant")
def cancel_transfer(transfer_id) -> StockTransfer:
    transfer = StockTransfer.objects.using("tenant").select_for_update().get(pk=transfer_id)
    if transfer.status == StockTransfer.Status.APPROVED:
        raise ValidationError("لا يمكن إلغاء إذن معتمد.")
    transfer.status = StockTransfer.Status.CANCELLED
    transfer.save(using="tenant", update_fields=["status"])
    return transfer


@transaction.atomic(using="tenant")
def create_scrap(*, data: dict, user) -> StockScrap:
    lines_data = data.get("lines") or []
    if not lines_data:
        raise ValidationError("أضف بندًا واحدًا على الأقل.")
    if not (data.get("reason") or "").strip():
        raise ValidationError("سبب الهالك مطلوب.")

    code = (data.get("code") or "").strip() or catalog_service._next_code("SC", StockScrap)
    scrap = StockScrap.objects.using("tenant").create(
        code=code,
        warehouse_id=data["warehouse"],
        reason=data["reason"].strip(),
        status=StockScrap.Status.DRAFT,
        created_by=user,
    )
    for row in lines_data:
        StockScrapLine.objects.using("tenant").create(
            scrap=scrap,
            variant_id=row["variant"],
            quantity=Decimal(str(row["quantity"])),
        )
    return scrap


@transaction.atomic(using="tenant")
def approve_scrap(scrap_id) -> StockScrap:
    scrap = (
        StockScrap.objects.using("tenant")
        .select_for_update()
        .prefetch_related("lines")
        .get(pk=scrap_id)
    )
    if scrap.status != StockScrap.Status.DRAFT:
        raise ValidationError("لا يمكن اعتماد هذا الإذن.")

    for line in scrap.lines.all():
        _adjust_balance(scrap.warehouse_id, line.variant_id, -line.quantity)

    scrap.status = StockScrap.Status.APPROVED
    scrap.save(using="tenant", update_fields=["status"])
    return scrap


@transaction.atomic(using="tenant")
def cancel_scrap(scrap_id) -> StockScrap:
    scrap = StockScrap.objects.using("tenant").select_for_update().get(pk=scrap_id)
    if scrap.status == StockScrap.Status.APPROVED:
        raise ValidationError("لا يمكن إلغاء إذن معتمد.")
    scrap.status = StockScrap.Status.CANCELLED
    scrap.save(using="tenant", update_fields=["status"])
    return scrap


def _create_stock_voucher_lines(*, parent, lines_data, line_model, parent_field: str) -> None:
    for row in lines_data:
        line_model.objects.using("tenant").create(
            **{parent_field: parent, "variant_id": row["variant"], "quantity": Decimal(str(row["quantity"]))}
        )


@transaction.atomic(using="tenant")
def create_disbursement(*, data: dict, user) -> StockDisbursement:
    lines_data = data.get("lines") or []
    if not lines_data:
        raise ValidationError("أضف بندًا واحدًا على الأقل.")
    purpose = data.get("purpose")
    if purpose not in dict(StockDisbursement.Purpose.choices):
        raise ValidationError("اختر غرض الصرف.")

    code = (data.get("code") or "").strip() or catalog_service._next_code("SR", StockDisbursement)
    voucher = StockDisbursement.objects.using("tenant").create(
        code=code,
        warehouse_id=data["warehouse"],
        purpose=purpose,
        notes=(data.get("notes") or "").strip(),
        status=StockDisbursement.Status.DRAFT,
        created_by=user,
    )
    _create_stock_voucher_lines(
        parent=voucher,
        lines_data=lines_data,
        line_model=StockDisbursementLine,
        parent_field="disbursement",
    )
    return voucher


@transaction.atomic(using="tenant")
def approve_disbursement(disbursement_id) -> StockDisbursement:
    voucher = (
        StockDisbursement.objects.using("tenant")
        .select_for_update()
        .prefetch_related("lines")
        .get(pk=disbursement_id)
    )
    if voucher.status != StockDisbursement.Status.DRAFT:
        raise ValidationError("لا يمكن اعتماد هذا الإذن.")

    for line in voucher.lines.all():
        _adjust_balance(voucher.warehouse_id, line.variant_id, -line.quantity)

    voucher.status = StockDisbursement.Status.APPROVED
    voucher.approved_at = timezone.now()
    voucher.save(using="tenant", update_fields=["status", "approved_at"])
    return voucher


@transaction.atomic(using="tenant")
def cancel_disbursement(disbursement_id) -> StockDisbursement:
    voucher = StockDisbursement.objects.using("tenant").select_for_update().get(pk=disbursement_id)
    if voucher.status == StockDisbursement.Status.APPROVED:
        raise ValidationError("لا يمكن إلغاء إذن معتمد.")
    voucher.status = StockDisbursement.Status.CANCELLED
    voucher.save(using="tenant", update_fields=["status"])
    return voucher


@transaction.atomic(using="tenant")
def create_addition(*, data: dict, user) -> StockAddition:
    lines_data = data.get("lines") or []
    if not lines_data:
        raise ValidationError("أضف بندًا واحدًا على الأقل.")
    purpose = data.get("purpose")
    if purpose not in dict(StockAddition.Purpose.choices):
        raise ValidationError("اختر غرض الإضافة.")

    code = (data.get("code") or "").strip() or catalog_service._next_code("AD", StockAddition)
    voucher = StockAddition.objects.using("tenant").create(
        code=code,
        warehouse_id=data["warehouse"],
        purpose=purpose,
        notes=(data.get("notes") or "").strip(),
        status=StockAddition.Status.DRAFT,
        created_by=user,
    )
    _create_stock_voucher_lines(
        parent=voucher,
        lines_data=lines_data,
        line_model=StockAdditionLine,
        parent_field="addition",
    )
    return voucher


@transaction.atomic(using="tenant")
def approve_addition(addition_id) -> StockAddition:
    voucher = (
        StockAddition.objects.using("tenant")
        .select_for_update()
        .prefetch_related("lines")
        .get(pk=addition_id)
    )
    if voucher.status != StockAddition.Status.DRAFT:
        raise ValidationError("لا يمكن اعتماد هذا الإذن.")

    for line in voucher.lines.all():
        _adjust_balance(voucher.warehouse_id, line.variant_id, line.quantity)

    voucher.status = StockAddition.Status.APPROVED
    voucher.approved_at = timezone.now()
    voucher.save(using="tenant", update_fields=["status", "approved_at"])
    return voucher


@transaction.atomic(using="tenant")
def cancel_addition(addition_id) -> StockAddition:
    voucher = StockAddition.objects.using("tenant").select_for_update().get(pk=addition_id)
    if voucher.status == StockAddition.Status.APPROVED:
        raise ValidationError("لا يمكن إلغاء إذن معتمد.")
    voucher.status = StockAddition.Status.CANCELLED
    voucher.save(using="tenant", update_fields=["status"])
    return voucher


def disbursement_purpose_options() -> list[dict]:
    return [
        {"key": k, "label_ar": label}
        for k, label in StockDisbursement.Purpose.choices
    ]


def addition_purpose_options() -> list[dict]:
    return [
        {"key": k, "label_ar": label}
        for k, label in StockAddition.Purpose.choices
    ]
