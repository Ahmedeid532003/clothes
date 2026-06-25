"""الفرع = نقطة البيع — لا يوجد كيان POS منفصل (PDF + متطلبات المنتج)."""

from __future__ import annotations

import uuid

from rest_framework.exceptions import PermissionDenied, ValidationError

from erp.branch_access import user_can_access_branch
from erp.models import Branch, BranchWarehouse, Warehouse

BRANCH_HEADER = "HTTP_X_BRANCH_ID"


def get_request_branch_id(request) -> str | None:
    raw = request.META.get(BRANCH_HEADER)
    if raw:
        return str(raw).strip()
    user = request.user
    if user and getattr(user, "is_authenticated", False) and user.default_branch_id:
        return str(user.default_branch_id)
    return None


def get_request_branch(request, *, required: bool = True) -> Branch | None:
    """
    يُرجع الفرع النشط من هيدر X-Branch-Id (نفس الفروع في الباقة).
    لا يمكن إنشاء فروع/نقاط بيع من الواجهة — فقط التبديل بين المسموح.
    """
    branch_id = get_request_branch_id(request)
    if not branch_id:
        if required:
            raise ValidationError(
                "اختر الفرع (نقطة البيع) من القائمة أعلى الشاشة — البيع يتم من الفروع فقط."
            )
        return None

    try:
        branch_uuid = uuid.UUID(branch_id)
    except ValueError as exc:
        raise ValidationError("معرّف الفرع غير صالح.") from exc

    user = request.user
    if not user or not user.is_authenticated:
        raise PermissionDenied("يجب تسجيل الدخول.")

    if not user_can_access_branch(user, branch_uuid):
        raise PermissionDenied("ليس لديك صلاحية البيع من هذا الفرع.")

    try:
        return Branch.objects.using("tenant").get(pk=branch_uuid, is_active=True)
    except Branch.DoesNotExist:
        raise ValidationError("الفرع غير موجود أو غير نشط.")


def get_branch_sale_warehouse(branch: Branch) -> Warehouse:
    """مخزن البيع للفرع — من ربط الفرع بالمخزن عند الإعداد."""
    link = (
        BranchWarehouse.objects.using("tenant")
        .filter(branch=branch, is_default=True)
        .select_related("warehouse")
        .first()
    )
    if not link:
        link = (
            BranchWarehouse.objects.using("tenant")
            .filter(branch=branch)
            .select_related("warehouse")
            .first()
        )
    if not link or not link.warehouse.is_active:
        raise ValidationError(
            f"لا يوجد مخزن مرتبط بفرع «{branch.name_ar}» — راجع إعداد الفروع."
        )
    return link.warehouse
