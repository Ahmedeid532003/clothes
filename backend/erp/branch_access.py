"""نطاق الفروع المتاحة لكل موظف."""

from __future__ import annotations

import uuid

from erp.models import Branch, User


def effective_permissions(user: User) -> dict:
    from erp.permissions_schema import full_permissions, merge_permissions

    if user.is_owner:
        return full_permissions()
    return merge_permissions(user.permissions)


def user_branch_ids(user: User) -> list[uuid.UUID] | None:
    """
    None = كل الفروع.
    قائمة = الفروع المسموحة فقط.
    """
    if user.is_owner or user.branch_access_mode == User.BranchAccessMode.ALL:
        return None
    if user.branch_access_mode == User.BranchAccessMode.SINGLE:
        if user.default_branch_id:
            return [user.default_branch_id]
        return []
    return list(user.allowed_branches.values_list("id", flat=True))


def branches_for_user(user: User):
    qs = Branch.objects.using("tenant").filter(is_active=True)
    ids = user_branch_ids(user)
    if ids is not None:
        qs = qs.filter(id__in=ids)
    return qs


def user_can_access_branch(user: User, branch_id: uuid.UUID) -> bool:
    ids = user_branch_ids(user)
    if ids is None:
        return True
    return branch_id in ids


def apply_branch_access(
    user: User,
    *,
    mode: str,
    branch_ids: list[uuid.UUID] | None,
    default_branch_id: uuid.UUID | None,
) -> None:
    user.branch_access_mode = mode
    user.default_branch = None

    if mode == User.BranchAccessMode.ALL:
        user.save(using="tenant", update_fields=["branch_access_mode", "default_branch", "updated_at"])
        user.allowed_branches.set([], clear=True)
        return

    if mode == User.BranchAccessMode.SINGLE:
        if not default_branch_id:
            raise ValueError("الفرع مطلوب عند اختيار فرع واحد.")
        user.default_branch_id = default_branch_id
        user.save(
            using="tenant",
            update_fields=["branch_access_mode", "default_branch", "updated_at"],
        )
        user.allowed_branches.set([default_branch_id])
        return

    # multiple
    ids = list(branch_ids or [])
    if not ids:
        raise ValueError("اختر فرعاً واحداً على الأقل.")
    user.default_branch_id = default_branch_id or ids[0]
    user.save(
        using="tenant",
        update_fields=["branch_access_mode", "default_branch", "updated_at"],
    )
    user.allowed_branches.set(ids)
