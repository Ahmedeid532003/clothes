"""إعداد الموردين الافتراضي، إذونات الدفع."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.services import catalog as catalog_service
from erp.services.banking import sync_supplier_payment_paper
from erp.supplier_models import (
    SupplierAccountEntry,
    SupplierCategory,
    SupplierDepartment,
    SupplierGroup,
    SupplierPayment,
    SupplierType,
)


DEFAULT_TYPES = [
    (
        "establishment",
        SupplierType.EntityKind.ESTABLISHMENT,
        "منشأة / مصنع",
        "Establishment / Factory",
        "مورد مصنع أو منشأة إنتاج",
    ),
    (
        "office",
        SupplierType.EntityKind.OFFICE,
        "مكتب",
        "Office / Trader",
        "مكتب توريد أو وسيط",
    ),
    (
        "establishment-office",
        SupplierType.EntityKind.ESTABLISHMENT_OFFICE,
        "منشأة ومكتب",
        "Establishment & Office",
        "يجمع الإنتاج والتوريد",
    ),
    (
        "shop",
        SupplierType.EntityKind.SHOP,
        "محل",
        "Shop",
        "مورد محل تجزئة",
    ),
    (
        "pos-point",
        SupplierType.EntityKind.POS_POINT,
        "نقطة بيع",
        "POS point",
        "شريك بيع / منفذ خارجي (ليس فروع نظامك)",
    ),
]

DEFAULT_CATEGORIES = [
    ("local", SupplierCategory.CategoryKind.LOCAL, "موردين محليين", "Local suppliers", ""),
    ("imported", SupplierCategory.CategoryKind.IMPORTED, "موردين مستوردين", "Imported suppliers", ""),
    ("wholesale", SupplierCategory.CategoryKind.WHOLESALE, "موردين جملة", "Wholesale suppliers", ""),
    ("retail", SupplierCategory.CategoryKind.RETAIL, "موردين قطاعى", "Retail suppliers", ""),
    ("strategic", SupplierCategory.CategoryKind.STRATEGIC, "موردين استراتيجيين", "Strategic suppliers", ""),
    ("seasonal", SupplierCategory.CategoryKind.SEASONAL, "موردين موسميين", "Seasonal suppliers", ""),
]

DEFAULT_DEPARTMENTS = [
    ("women", SupplierDepartment.DeptKind.WOMEN, "حريمى", "Women", ""),
    ("men", SupplierDepartment.DeptKind.MEN, "رجالى", "Men", ""),
    ("children", SupplierDepartment.DeptKind.CHILDREN, "أطفالى", "Children", ""),
    ("shoes", SupplierDepartment.DeptKind.SHOES, "أحذية", "Shoes", ""),
    ("bags", SupplierDepartment.DeptKind.BAGS, "شنط", "Bags", ""),
    ("accessories", SupplierDepartment.DeptKind.ACCESSORIES, "إكسسوارات", "Accessories", ""),
    ("watches", SupplierDepartment.DeptKind.WATCHES, "ساعات", "Watches", ""),
    ("cosmetics", SupplierDepartment.DeptKind.COSMETICS, "مستحضرات تجميل", "Cosmetics", ""),
    ("sportswear", SupplierDepartment.DeptKind.SPORTSWEAR, "ملابس رياضية", "Sportswear", ""),
]

DEFAULT_GROUPS = [
    (
        "consignment",
        SupplierGroup.SettlementMode.CONSIGNMENT,
        "أمانات",
        "Consignment",
        "بضاعة أمانات — تُسجّل مبيعات بتكلفة المورد",
    ),
    (
        "cash",
        SupplierGroup.SettlementMode.CASH,
        "نقدي",
        "Cash",
        "شراء نقدي — دفع فوري",
    ),
    (
        "credit-returns",
        SupplierGroup.SettlementMode.CREDIT_WITH_RETURNS,
        "أجل ومرتجعات بمواعيد",
        "Credit + scheduled returns",
        "آجل مع جدول مرتجعات متفق عليه",
    ),
    (
        "credit-no-returns",
        SupplierGroup.SettlementMode.CREDIT_NO_RETURNS,
        "أجل بدون مرتجعات",
        "Credit, no returns",
        "آجل بدون سياسة مرتجعات",
    ),
]


def _tenant_table_exists(model) -> bool:
    from django.db import connections

    return model._meta.db_table in connections["tenant"].introspection.table_names()


def seed_supplier_defaults() -> dict:
    types_created = 0
    groups_created = 0
    categories_created = 0
    departments_created = 0
    for code, kind, name_ar, name_en, desc in DEFAULT_TYPES:
        _, created = SupplierType.objects.using("tenant").get_or_create(
            code=code,
            defaults={
                "name_ar": name_ar,
                "name_en": name_en,
                "entity_kind": kind,
                "description": desc,
                "is_system": True,
            },
        )
        if created:
            types_created += 1
    for code, mode, name_ar, name_en, desc in DEFAULT_GROUPS:
        _, created = SupplierGroup.objects.using("tenant").get_or_create(
            code=code,
            defaults={
                "name_ar": name_ar,
                "name_en": name_en,
                "settlement_mode": mode,
                "description": desc,
                "is_system": True,
            },
        )
        if created:
            groups_created += 1
    if _tenant_table_exists(SupplierCategory):
        for code, kind, name_ar, name_en, desc in DEFAULT_CATEGORIES:
            _, created = SupplierCategory.objects.using("tenant").get_or_create(
                code=code,
                defaults={
                    "name_ar": name_ar,
                    "name_en": name_en,
                    "category_kind": kind,
                    "description": desc,
                    "is_system": True,
                },
            )
            if created:
                categories_created += 1
    if _tenant_table_exists(SupplierDepartment):
        for code, kind, name_ar, name_en, desc in DEFAULT_DEPARTMENTS:
            _, created = SupplierDepartment.objects.using("tenant").get_or_create(
                code=code,
                defaults={
                    "name_ar": name_ar,
                    "name_en": name_en,
                    "dept_kind": kind,
                    "description": desc,
                    "is_system": True,
                },
            )
            if created:
                departments_created += 1
    return {
        "types_created": types_created,
        "groups_created": groups_created,
        "categories_created": categories_created,
        "departments_created": departments_created,
    }


def supplier_meta() -> dict:
    types = []
    for row in SupplierType.objects.using("tenant").filter(is_active=True).order_by("code"):
        types.append(
            {
                "id": str(row.id),
                "code": row.code,
                "name_ar": row.name_ar,
                "name_en": row.name_en,
                "entity_kind": row.entity_kind,
                "entity_kind_label": row.get_entity_kind_display(),
                "description": row.description,
                "is_system": row.is_system,
            }
        )
    groups = []
    for row in SupplierGroup.objects.using("tenant").filter(is_active=True).order_by("code"):
        groups.append(
            {
                "id": str(row.id),
                "code": row.code,
                "name_ar": row.name_ar,
                "name_en": row.name_en,
                "settlement_mode": row.settlement_mode,
                "settlement_mode_label": row.get_settlement_mode_display(),
                "description": row.description,
                "is_system": row.is_system,
            }
        )
    return {
        "entity_kinds": [
            {"key": k, "label": v}
            for k, v in SupplierType.EntityKind.choices
        ],
        "settlement_modes": [
            {"key": k, "label": v}
            for k, v in SupplierGroup.SettlementMode.choices
        ],
        "types": types,
        "groups": groups,
        "categories": _catalog_rows(SupplierCategory, "category_kind", SupplierCategory.CategoryKind),
        "departments": _catalog_rows(SupplierDepartment, "dept_kind", SupplierDepartment.DeptKind),
    }


def _catalog_rows(model, kind_field: str, choices_class) -> list[dict]:
    rows = []
    for row in model.objects.using("tenant").filter(is_active=True).order_by("code"):
        kind = getattr(row, kind_field)
        rows.append(
            {
                "id": str(row.id),
                "code": row.code,
                "name_ar": row.name_ar,
                "name_en": row.name_en,
                kind_field: kind,
                f"{kind_field}_label": dict(choices_class.choices).get(kind, kind),
                "description": row.description,
                "is_system": row.is_system,
            }
        )
    return rows


def resolve_supplier_refs(
    *,
    entity_kind: str | None = None,
    settlement_mode: str | None = None,
    supplier_type_id=None,
    supplier_group_id=None,
) -> tuple[SupplierType, SupplierGroup]:
    """يربط نوع الكيان ومجموعة التسوية بسجلات قاعدة البيانات (مع تهيئة افتراضية)."""
    seed_supplier_defaults()

    type_row = None
    if supplier_type_id:
        type_row = (
            SupplierType.objects.using("tenant")
            .filter(pk=supplier_type_id, is_active=True)
            .first()
        )
    elif entity_kind:
        type_row = (
            SupplierType.objects.using("tenant")
            .filter(entity_kind=entity_kind, is_active=True)
            .first()
        )
        if not type_row:
            code = next((c for c, k, *_ in DEFAULT_TYPES if k == entity_kind), None)
            if code:
                type_row = (
                    SupplierType.objects.using("tenant")
                    .filter(code=code, is_active=True)
                    .first()
                )

    group_row = None
    if supplier_group_id:
        group_row = (
            SupplierGroup.objects.using("tenant")
            .filter(pk=supplier_group_id, is_active=True)
            .first()
        )
    elif settlement_mode:
        group_row = (
            SupplierGroup.objects.using("tenant")
            .filter(settlement_mode=settlement_mode, is_active=True)
            .first()
        )
        if not group_row:
            code = next((c for c, m, *_ in DEFAULT_GROUPS if m == settlement_mode), None)
            if code:
                group_row = (
                    SupplierGroup.objects.using("tenant")
                    .filter(code=code, is_active=True)
                    .first()
                )

    if not type_row:
        raise ValidationError(
            "نوع المورد غير جاهز. افتح «أنواع الموردين» ثم حدّث الصفحة."
        )
    if not group_row:
        raise ValidationError(
            "مجموعة المورد غير جاهزة. افتح «مجموعات الموردين» ثم حدّث الصفحة."
        )
    return type_row, group_row


@transaction.atomic(using="tenant")
def create_supplier_payment(*, data: dict, user) -> SupplierPayment:
    amount = Decimal(str(data["amount"]))
    if amount <= 0:
        raise ValidationError("مبلغ الدفع يجب أن يكون أكبر من صفر.")

    code = (data.get("code") or "").strip() or catalog_service._next_code("SP", SupplierPayment)
    payment = SupplierPayment.objects.using("tenant").create(
        code=code,
        supplier_id=data["supplier"],
        amount=amount,
        payment_date=data["payment_date"],
        payment_method=data.get("payment_method", SupplierPayment.PaymentMethod.CASH),
        notes=(data.get("notes") or "").strip(),
        status=SupplierPayment.Status.DRAFT,
        created_by=user,
    )
    return payment


@transaction.atomic(using="tenant")
def approve_supplier_payment(payment_id, user) -> SupplierPayment:
    payment = (
        SupplierPayment.objects.using("tenant")
        .select_for_update()
        .select_related("supplier")
        .get(pk=payment_id)
    )
    if payment.status != SupplierPayment.Status.DRAFT:
        raise ValidationError("لا يمكن اعتماد هذا الإذن.")

    entry_code = catalog_service._next_code("SA", SupplierAccountEntry)
    entry = SupplierAccountEntry.objects.using("tenant").create(
        code=entry_code,
        supplier=payment.supplier,
        entry_type=SupplierAccountEntry.EntryType.CREDIT,
        amount=payment.amount,
        notes=f"دفع مورد — {payment.code}",
    )
    payment.status = SupplierPayment.Status.APPROVED
    payment.account_entry = entry
    payment.approved_by = user
    payment.approved_at = timezone.now()
    payment.save(
        using="tenant",
        update_fields=["status", "account_entry", "approved_by", "approved_at"],
    )
    sync_supplier_payment_paper(payment, user)
    return payment


@transaction.atomic(using="tenant")
def cancel_supplier_payment(payment_id) -> SupplierPayment:
    payment = SupplierPayment.objects.using("tenant").select_for_update().get(pk=payment_id)
    if payment.status == SupplierPayment.Status.APPROVED:
        raise ValidationError("لا يمكن إلغاء إذن دفع معتمد.")
    payment.status = SupplierPayment.Status.CANCELLED
    payment.save(using="tenant", update_fields=["status"])
    return payment
