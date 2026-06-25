"""إعداد منشأة جديدة: DB + فروع + مستخدم مالك."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
import secrets
import string
from typing import Any

from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from erp.models import Branch, Season, User
from erp.services import branches as branch_service
from saas.models import GlobalUsername, Subscription, Tenant
from tenancy.context import set_current_tenant
from tenancy.services import ensure_tenant_connection, provision_tenant_database


def _next_owner_employee_code() -> str:
    """
    لا نفترض أن قاعدة المنشأة فارغة؛ قد يكون فيها مستخدمون من محاولة إعداد سابقة.
    """
    existing = (
        User.objects.using("tenant")
        .filter(employee_code__startswith="EMP-")
        .order_by("-employee_code")
        .values_list("employee_code", flat=True)
        .first()
    )
    n = 1
    if existing:
        try:
            n = int(str(existing).split("-")[-1]) + 1
        except ValueError:
            n = User.objects.using("tenant").count() + 1

    while True:
        code = f"EMP-{n:03d}"
        if not User.objects.using("tenant").filter(employee_code=code).exists():
            return code
        n += 1


def make_owner_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def default_owner_username(tenant: Tenant) -> str:
    base = f"owner@{tenant.slug}".strip().lower()
    username = base
    n = 2
    while GlobalUsername.objects.filter(username=username).exclude(tenant=tenant).exists():
        username = f"{base}{n}"
        n += 1
    return username


@dataclass
class BranchInput:
    name: str
    image: Any = None  # UploadedFile | None


@dataclass
class OwnerInput:
    username: str
    password: str
    full_name: str = ""


def setup_new_tenant(
    tenant: Tenant,
    *,
    owner: OwnerInput,
    branches: list[BranchInput],
    create_default_season: bool = True,
) -> User:
    """
    ينشئ قاعدة PostgreSQL، الفروع، مخزن لكل فرع، موسم افتراضي، ومستخدم مالك.
    """
    plan = tenant.plan
    if len(branches) != plan.max_branches:
        raise ValueError(
            f"الباقة '{plan.name}' تتطلب {plan.max_branches} فرع/فروع، "
            f"تم إرسال {len(branches)}."
        )

    username = owner.username.strip().lower()
    if GlobalUsername.objects.filter(username=username).exists():
        raise ValueError(f"اسم المستخدم '{username}' مستخدم بالفعل.")

    provision_tenant_database(tenant)

    set_current_tenant(tenant)
    created_branches: list[Branch] = []

    with transaction.atomic(using="tenant"):
        for index, item in enumerate(branches, start=1):
            name = item.name.strip()
            code = slugify(name)[:50] or f"branch-{index}"
            if Branch.objects.using("tenant").filter(code=code).exists():
                code = f"{code}-{index}"[:50]

            branch = Branch.objects.using("tenant").create(
                code=code,
                name_ar=name,
                name_en=name,
                is_active=True,
            )
            if item.image:
                branch.image = item.image
                branch.save(using="tenant")

            branch_service.ensure_branch_sale_warehouse(branch)
            created_branches.append(branch)

        if create_default_season:
            Season.objects.using("tenant").get_or_create(
                code="current",
                defaults={
                    "name_ar": "الموسم الحالي",
                    "name_en": "Current Season",
                    "is_open": True,
                    "is_current": True,
                },
            )

        from erp.permissions_schema import full_permissions

        user = User._default_manager.db_manager("tenant").create_user(
            username=username,
            password=owner.password,
            full_name=owner.full_name or username,
            default_branch=created_branches[0],
            email=tenant.contact_email or "",
            employee_code=_next_owner_employee_code(),
            is_owner=True,
            permissions=full_permissions(),
        )

    Subscription.objects.filter(tenant=tenant, is_current=True).update(is_current=False)
    Subscription.objects.create(
        tenant=tenant,
        plan=plan,
        starts_at=timezone.localdate(),
        ends_at=timezone.localdate() + timedelta(days=365),
        is_current=True,
    )

    GlobalUsername.objects.create(username=username, tenant=tenant)

    tenant.status = Tenant.Status.ACTIVE
    tenant.owner_username = username
    tenant.owner_initial_password = owner.password
    tenant.save(
        update_fields=["status", "updated_at", "owner_username", "owner_initial_password"]
    )

    return user


def ensure_tenant_owner(
    tenant: Tenant,
    *,
    username: str | None = None,
    password: str | None = None,
    full_name: str = "",
) -> tuple[User, str]:
    """
    يستكمل منشأة تم حفظها لكن تعطل إعدادها: فرع افتراضي، موسم، مالك، واشتراك.
    """
    ensure_tenant_connection(tenant)
    set_current_tenant(tenant)

    final_username = (username or tenant.owner_username or default_owner_username(tenant)).strip().lower()
    final_password = password or tenant.owner_initial_password or make_owner_password()

    if GlobalUsername.objects.filter(username=final_username).exclude(tenant=tenant).exists():
        raise ValueError(f"اسم المستخدم '{final_username}' مستخدم بالفعل في منشأة أخرى.")

    with transaction.atomic(using="tenant"):
        branch = Branch.objects.using("tenant").order_by("code").first()
        if not branch:
            branch = Branch.objects.using("tenant").create(
                code="main",
                name_ar="الفرع الرئيسي",
                name_en="Main Branch",
                is_active=True,
            )
        branch_service.ensure_branch_sale_warehouse(branch)

        Season.objects.using("tenant").get_or_create(
            code="current",
            defaults={
                "name_ar": "الموسم الحالي",
                "name_en": "Current Season",
                "is_open": True,
                "is_current": True,
            },
        )

        from erp.permissions_schema import full_permissions

        user = User.objects.using("tenant").filter(username=final_username).first()
        if user:
            user.is_owner = True
            user.is_active = True
            user.default_branch = user.default_branch or branch
            user.permissions = full_permissions()
            if not user.employee_code:
                user.employee_code = _next_owner_employee_code()
            user.set_password(final_password)
            user.save(using="tenant")
        else:
            user = User._default_manager.db_manager("tenant").create_user(
                username=final_username,
                password=final_password,
                full_name=full_name or tenant.name or final_username,
                default_branch=branch,
                email=tenant.contact_email or "",
                employee_code=_next_owner_employee_code(),
                is_owner=True,
                permissions=full_permissions(),
            )

    GlobalUsername.objects.get_or_create(username=final_username, defaults={"tenant": tenant})
    Subscription.objects.filter(tenant=tenant, is_current=True).update(is_current=False)
    Subscription.objects.create(
        tenant=tenant,
        plan=tenant.plan,
        starts_at=timezone.localdate(),
        ends_at=timezone.localdate() + timedelta(days=365),
        is_current=True,
    )

    tenant.status = Tenant.Status.ACTIVE
    tenant.owner_username = final_username
    tenant.owner_initial_password = final_password
    tenant.save(update_fields=["status", "updated_at", "owner_username", "owner_initial_password"])
    return user, final_password


def reset_tenant_owner_password(tenant: Tenant, new_password: str) -> str:
    """تعيين كلمة مرور جديدة للمالك وحفظها في سجل المنصة."""
    if not tenant.owner_username:
        raise ValueError("لا يوجد owner_username مسجل لهذه المنشأة.")

    set_current_tenant(tenant)
    ensure_tenant_connection(tenant)

    user = User.objects.using("tenant").get(username=tenant.owner_username)
    user.set_password(new_password)
    user.save(using="tenant")

    tenant.owner_initial_password = new_password
    tenant.save(update_fields=["owner_initial_password", "updated_at"])
    return tenant.owner_username
