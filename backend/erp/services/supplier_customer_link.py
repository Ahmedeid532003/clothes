"""ربط المورد كعميل — إنشاء حساب عميل وكشف موحد."""

from __future__ import annotations

from decimal import Decimal

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.customer_models import Customer, CustomerGroup, CustomerType
from erp.services import catalog as catalog_service
from erp.services.customers import seed_customer_defaults
from erp.supplier_models import Supplier

_USING = "tenant"

_ENTITY_TO_CUSTOMER_SLUG = {
    "establishment": CustomerType.Slug.ESTABLISHMENT,
    "factory": CustomerType.Slug.ESTABLISHMENT,
    "office": CustomerType.Slug.ESTABLISHMENT,
    "shop": CustomerType.Slug.SHOP,
    "pos_point": CustomerType.Slug.SHOP,
}


def ensure_customer_for_supplier(supplier: Supplier, user=None) -> Customer:
    if supplier.linked_customer_id:
        return (
            Customer.objects.using(_USING)
            .select_related("customer_type", "customer_group")
            .get(pk=supplier.linked_customer_id, is_active=True)
        )

    seed_customer_defaults()
    entity_kind = getattr(supplier.supplier_type, "entity_kind", "establishment")
    slug = _ENTITY_TO_CUSTOMER_SLUG.get(entity_kind, CustomerType.Slug.ESTABLISHMENT)
    customer_type = (
        CustomerType.objects.using(_USING)
        .filter(slug=slug, is_active=True)
        .order_by("code")
        .first()
    )
    if not customer_type:
        customer_type = CustomerType.objects.using(_USING).filter(is_active=True).order_by("code").first()
    if not customer_type:
        raise ValidationError("أنواع العملاء غير مهيأة.")

    customer_group = (
        CustomerGroup.objects.using(_USING)
        .filter(code="CG-COR", is_active=True)
        .first()
        or CustomerGroup.objects.using(_USING).filter(is_active=True).order_by("code").first()
    )
    if not customer_group:
        raise ValidationError("مجموعات العملاء غير مهيأة.")

    code = catalog_service._next_code("CUS", Customer)
    customer = Customer.objects.using(_USING).create(
        code=code,
        customer_type=customer_type,
        customer_group=customer_group,
        name_ar=supplier.name_ar,
        name_en=supplier.name_en or "",
        phone=supplier.phone or "",
        whatsapp=supplier.whatsapp or "",
        notes=f"عميل مرتبط بالمورد {supplier.code}",
        credit_limit=customer_group.default_credit_limit or Decimal("0"),
        discount_percent=customer_group.default_discount_percent or Decimal("0"),
        payment_policy=customer_group.default_payment_policy or "credit_30",
        barcode=code,
        created_by=user,
        last_activity_at=timezone.now(),
    )
    supplier.linked_customer_id = customer.id
    supplier.is_also_customer = True
    supplier.save(using=_USING, update_fields=["linked_customer_id", "is_also_customer", "updated_at"])
    return customer


def sync_supplier_customer_role(*, supplier: Supplier, is_also_customer: bool, user=None) -> Supplier:
    if is_also_customer:
        ensure_customer_for_supplier(supplier, user=user)
        if not supplier.is_also_customer:
            supplier.is_also_customer = True
            supplier.save(using=_USING, update_fields=["is_also_customer", "updated_at"])
    else:
        if supplier.is_also_customer:
            supplier.is_also_customer = False
            supplier.save(using=_USING, update_fields=["is_also_customer", "updated_at"])
    return supplier
