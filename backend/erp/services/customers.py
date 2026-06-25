"""عملاء — تهيئة، شجرة مجموعات، تحقق ديناميكي، لوحة المجموعات."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from erp.customer_models import (
    Customer,
    CustomerActivityLog,
    CustomerAttachment,
    CustomerGroup,
    CustomerType,
)
from erp.services import catalog as catalog_service
from erp.services.customers_validation import validate_egyptian_national_id

_USING = "tenant"
_QUANT = Decimal("0.01")
_GUARANTOR_KEYS = ("name", "phone", "national_id", "job_title", "address")


def profile_spouse(profile: dict) -> str:
    return str(profile.get("spouse_name") or profile.get("husband_name") or "").strip()


def profile_guarantor_rows(profile: dict) -> list[dict]:
    rows = []
    for i in range(1, 4):
        row = {k: str(profile.get(f"guarantor_{i}_{k}") or "").strip() for k in _GUARANTOR_KEYS}
        if i == 1 and not row["name"]:
            row["name"] = str(profile.get("guarantor_name") or "").strip()
        rows.append(row)
    return rows


def profile_guarantor_summary(profile: dict) -> str:
    names = [r["name"] for r in profile_guarantor_rows(profile) if r["name"]]
    return " · ".join(names)


def profile_search_haystack(customer: Customer, profile: dict) -> str:
    parts = [
        customer.name_ar,
        customer.code,
        customer.phone,
        customer.whatsapp,
        profile_spouse(profile),
        profile.get("job_title"),
        customer.notes,
    ]
    for row in profile_guarantor_rows(profile):
        parts.extend(row.values())
    return " ".join(str(p) for p in parts if p).lower()

# حقول الكتالوج القياسية لبناء الفورم الديناميكي
FIELD_CATALOG = {
    "name_ar": {"type": "text", "label_ar": "الاسم", "label_en": "Name"},
    "phone": {"type": "tel", "label_ar": "الهاتف", "label_en": "Phone"},
    "whatsapp": {"type": "tel", "label_ar": "واتساب", "label_en": "WhatsApp"},
    "email": {"type": "email", "label_ar": "البريد", "label_en": "Email"},
    "address": {"type": "textarea", "label_ar": "العنوان", "label_en": "Address"},
    "commercial_register": {
        "type": "text",
        "label_ar": "السجل التجاري",
        "label_en": "Commercial register",
    },
    "tax_id": {"type": "text", "label_ar": "الرقم الضريبي", "label_en": "Tax ID"},
    "company_name": {"type": "text", "label_ar": "اسم المنشأة", "label_en": "Company name"},
    "legal_representative": {
        "type": "text",
        "label_ar": "الممثل القانوني",
        "label_en": "Legal representative",
    },
    "shop_name": {"type": "text", "label_ar": "اسم المحل", "label_en": "Shop name"},
    "owner_name": {"type": "text", "label_ar": "اسم المالك", "label_en": "Owner name"},
    "license_number": {"type": "text", "label_ar": "رقم الترخيص", "label_en": "License no."},
    "national_id": {"type": "text", "label_ar": "الرقم القومي", "label_en": "National ID"},
    "notes": {"type": "textarea", "label_ar": "ملاحظات", "label_en": "Notes"},
    "full_name_quad": {"type": "text", "label_ar": "الاسم رباعي", "label_en": "Full name"},
    "owner_phone": {"type": "tel", "label_ar": "هاتف المالك", "label_en": "Owner phone"},
    "responsible_name": {"type": "text", "label_ar": "اسم المسئول", "label_en": "Responsible"},
    "responsible_phone": {"type": "tel", "label_ar": "هاتف المسئول", "label_en": "Responsible phone"},
    "governorate": {"type": "text", "label_ar": "المحافظة", "label_en": "Governorate"},
    "city": {"type": "text", "label_ar": "المدينة", "label_en": "City"},
    "district": {"type": "text", "label_ar": "المنطقة", "label_en": "District"},
    "address_detail": {"type": "textarea", "label_ar": "العنوان بالتفصيل", "label_en": "Address"},
    "gps_location": {"type": "gps", "label_ar": "GPS", "label_en": "GPS"},
    "payment_days": {"type": "select", "label_ar": "مدة السداد", "label_en": "Payment terms"},
    "payment_method": {"type": "select", "label_ar": "طريقة الدفع", "label_en": "Payment method"},
    "route_line": {"type": "text", "label_ar": "خط السير", "label_en": "Route"},
    "customer_rating": {"type": "rating", "label_ar": "تقييم العميل", "label_en": "Rating"},
}

DEFAULT_WORKFLOW = [
    {"key": "draft", "label_ar": "مسودة", "label_en": "Draft"},
    {"key": "review", "label_ar": "مراجعة", "label_en": "Review"},
    {"key": "approved", "label_ar": "معتمد", "label_en": "Approved"},
    {"key": "active", "label_ar": "نشط", "label_en": "Active"},
    {"key": "suspended", "label_ar": "موقوف", "label_en": "Suspended"},
]

DEFAULT_VISIBILITY = {
    "owner": ["*"],
    "manager": ["*"],
    "sales": [
        "name_ar",
        "phone",
        "whatsapp",
        "address",
        "shop_name",
        "owner_name",
        "national_id",
        "company_name",
    ],
    "accountant": ["*"],
}


def _section_for_key(key: str) -> str:
    if key in ("shop_name", "owner_name", "owner_phone", "responsible_name", "responsible_phone"):
        return "shop"
    if key in (
        "full_name_quad",
        "national_id",
        "gender",
        "birth_date",
        "job_title",
        "employer",
        "marital_status",
        "spouse_name",
        "children_count",
    ):
        return "personal"
    if key in ("phone", "whatsapp", "extra_phone", "email", "phone_verified"):
        return "contact"
    if key in ("governorate", "city", "district", "address_detail", "gps_location"):
        return "address"
    if "file" in key or key.endswith("_photo") or key.endswith("_file"):
        return "files"
    if key in ("route_line", "customer_rating"):
        return "ops"
    if key in ("uses_consignment", "is_stopped", "stop_reason"):
        return "flags"
    if key in ("last_deal_date", "purchase_count", "avg_purchase_amount"):
        return "stats"
    if key in (
        "credit_limit",
        "payment_days",
        "discount_percent",
        "payment_method",
        "salary",
        "income_source",
        "installment_plan",
        "interest_rate",
        "risk_rating",
    ):
        return "finance"
    if key.startswith("guarantor_"):
        return "guarantors"
    return "other"


def _shop_form_schema():
    keys = [
        "shop_name",
        "owner_name",
        "owner_phone",
        "responsible_name",
        "responsible_phone",
        "whatsapp",
        "governorate",
        "city",
        "district",
        "address_detail",
        "gps_location",
        "shop_photo",
        "commercial_register_file",
        "tax_card_file",
        "extra_attachments",
        "route_line",
        "customer_rating",
        "uses_consignment",
        "is_stopped",
        "stop_reason",
        "credit_limit",
        "payment_days",
        "discount_percent",
        "payment_method",
        "notes",
    ]
    return [{"key": k, "section": _section_for_key(k)} for k in keys]


def _individual_form_schema():
    keys = [
        "full_name_quad",
        "national_id",
        "gender",
        "birth_date",
        "job_title",
        "employer",
        "marital_status",
        "spouse_name",
        "children_count",
        "phone",
        "phone_verified",
        "whatsapp",
        "extra_phone",
        "email",
        "governorate",
        "city",
        "district",
        "address_detail",
        "gps_location",
        "salary",
        "income_source",
        "credit_limit",
        "payment_days",
        "discount_percent",
        "payment_method",
        "installment_plan",
        "interest_rate",
        "guarantor_1_name",
        "guarantor_1_phone",
        "guarantor_1_national_id",
        "guarantor_1_job_title",
        "guarantor_1_address",
        "guarantor_2_name",
        "guarantor_2_phone",
        "guarantor_2_national_id",
        "guarantor_2_job_title",
        "guarantor_2_address",
        "guarantor_3_name",
        "guarantor_3_phone",
        "guarantor_3_national_id",
        "guarantor_3_job_title",
        "guarantor_3_address",
        "risk_rating",
        "id_photo_front",
        "id_photo_back",
        "utility_receipt",
        "contract_file",
        "notes",
    ]
    return [{"key": k, "section": _section_for_key(k)} for k in keys]


TYPE_TEMPLATES = {
    CustomerType.Slug.ESTABLISHMENT: {
        "code": "CT-EST",
        "name_ar": "منشأة",
        "name_en": "Establishment",
        "form_schema": [
            {"key": "company_name", "section": "main"},
            {"key": "commercial_register", "section": "main"},
            {"key": "tax_id", "section": "main"},
            {"key": "legal_representative", "section": "main"},
            {"key": "phone", "section": "contact"},
            {"key": "email", "section": "contact"},
            {"key": "address", "section": "contact"},
            {"key": "notes", "section": "other"},
        ],
        "mandatory_fields": [
            "company_name",
            "commercial_register",
            "tax_id",
            "phone",
            "address",
        ],
    },
    CustomerType.Slug.SHOP: {
        "code": "CT-SHP",
        "name_ar": "محل",
        "name_en": "Shop",
        "description": "نموذج مبسط للمحلات — بدون بيانات شخصية كاملة",
        "form_schema": _shop_form_schema(),
        "mandatory_fields": [
            "shop_name",
            "owner_name",
            "owner_phone",
            "governorate",
            "address_detail",
        ],
    },
    CustomerType.Slug.INDIVIDUAL: {
        "code": "CT-IND",
        "name_ar": "فرد",
        "name_en": "Individual",
        "description": "نموذج كامل مع رقم قومي وتحقق ومرفقات",
        "form_schema": _individual_form_schema(),
        "mandatory_fields": ["full_name_quad", "national_id", "phone"],
    },
}

DEFAULT_GROUPS = [
    ("CG-WHL", "عملاء جملة", "Wholesale", None, "10", "credit_30", "500000", "low", "large"),
    ("CG-RTL", "عملاء قطاعي", "Retail", None, "0", "cash", "50000", "low", "medium"),
    ("CG-VIP", "VIP", "VIP", None, "5", "credit_60", "1000000", "low", "key"),
    ("CG-DEL", "عملاء متعثرين", "Delinquent", None, "0", "cash", "0", "blocked", "small"),
    ("CG-DST", "موزعين", "Distributors", None, "8", "credit_15", "300000", "medium", "large"),
    ("CG-ONL", "أونلاين", "Online", None, "3", "credit_7", "100000", "medium", "medium"),
    ("CG-COR", "عملاء شركات", "Corporate", None, "7", "credit_30", "800000", "low", "key"),
    ("CG-CLR", "عملاء تصريف", "Clearance", None, "15", "cash", "20000", "high", "small"),
]


def _enrich_form_schema(raw_schema: list) -> list:
    out = []
    for item in raw_schema:
        key = item.get("key")
        if not key:
            continue
        cat = FIELD_CATALOG.get(key, {})
        out.append(
            {
                **item,
                "key": key,
                "type": item.get("type") or cat.get("type", "text"),
                "label_ar": item.get("label_ar") or cat.get("label_ar", key),
                "label_en": item.get("label_en") or cat.get("label_en", key),
            }
        )
    return out


def _serialize_type(t: CustomerType) -> dict:
    return {
        "id": str(t.pk),
        "code": t.code,
        "slug": t.slug,
        "name_ar": t.name_ar,
        "name_en": t.name_en,
        "description": t.description,
        "is_system": t.is_system,
        "is_active": t.is_active,
        "mandatory_fields": t.mandatory_fields or [],
        "field_visibility": t.field_visibility or {},
        "workflow_steps": t.workflow_steps or [],
        "form_schema": _enrich_form_schema(t.form_schema or []),
        "customers_count": t.customers.filter(is_active=True).count(),
    }


def _rebuild_group_tree(group: CustomerGroup):
    if group.parent_id:
        parent = CustomerGroup.objects.using(_USING).get(pk=group.parent_id)
        group.level = parent.level + 1
        group.tree_path = f"{parent.tree_path}/{group.code}"
        group.path_label = f"{parent.path_label} › {group.name_ar}"
    else:
        group.level = 0
        group.tree_path = group.code
        group.path_label = group.name_ar
    group.save(using=_USING, update_fields=["level", "tree_path", "path_label"])
    for child in CustomerGroup.objects.using(_USING).filter(parent_id=group.pk):
        _rebuild_group_tree(child)


def _serialize_group(g: CustomerGroup, *, stats: dict | None = None) -> dict:
    row = {
        "id": str(g.pk),
        "code": g.code,
        "name_ar": g.name_ar,
        "name_en": g.name_en,
        "parent": str(g.parent_id) if g.parent_id else None,
        "parent_name": g.parent.name_ar if g.parent_id else None,
        "level": g.level,
        "tree_path": g.tree_path,
        "path_label": g.path_label,
        "default_discount_percent": str(g.default_discount_percent),
        "default_payment_policy": g.default_payment_policy,
        "default_credit_limit": str(g.default_credit_limit),
        "region": g.region,
        "salesperson": str(g.salesperson_id) if g.salesperson_id else None,
        "salesperson_name": (
            (g.salesperson.full_name or g.salesperson.username)
            if getattr(g, "salesperson", None)
            else None
        ),
        "risk_level": g.risk_level,
        "volume_tier": g.volume_tier,
        "notes": g.notes,
        "display_color": getattr(g, "display_color", None) or "#4F46E5",
        "is_system": g.is_system,
        "is_active": g.is_active,
        "children_count": g.children.filter(is_active=True).count(),
    }
    if stats is not None:
        row["stats"] = stats
    return row


def seed_customer_defaults() -> dict:
    types_created = 0
    groups_created = 0
    for slug, tpl in TYPE_TEMPLATES.items():
        _, created = CustomerType.objects.using(_USING).get_or_create(
            slug=slug,
            defaults={
                "code": tpl["code"],
                "name_ar": tpl["name_ar"],
                "name_en": tpl["name_en"],
                "form_schema": tpl["form_schema"],
                "mandatory_fields": tpl["mandatory_fields"],
                "field_visibility": DEFAULT_VISIBILITY,
                "workflow_steps": DEFAULT_WORKFLOW,
                "is_system": True,
            },
        )
        if created:
            types_created += 1
    sync_system_customer_types()
    for code, name_ar, name_en, parent_code, disc, policy, limit, risk, vol in DEFAULT_GROUPS:
        parent = None
        if parent_code:
            parent = CustomerGroup.objects.using(_USING).filter(code=parent_code).first()
        _, created = CustomerGroup.objects.using(_USING).get_or_create(
            code=code,
            defaults={
                "name_ar": name_ar,
                "name_en": name_en,
                "parent": parent,
                "default_discount_percent": Decimal(disc),
                "default_payment_policy": policy,
                "default_credit_limit": Decimal(limit),
                "risk_level": risk,
                "volume_tier": vol,
                "is_system": True,
            },
        )
        if created:
            groups_created += 1
    for g in CustomerGroup.objects.using(_USING).all():
        _rebuild_group_tree(g)
    return {"types_created": types_created, "groups_created": groups_created}


def sync_system_customer_types() -> int:
    """تحديث أنواع النظام (محل/فرد) بمخططات الفورم الذكية."""
    updated = 0
    for slug, tpl in TYPE_TEMPLATES.items():
        t = CustomerType.objects.using(_USING).filter(slug=slug, is_system=True).first()
        if not t:
            continue
        t.form_schema = tpl["form_schema"]
        t.mandatory_fields = tpl["mandatory_fields"]
        if tpl.get("description"):
            t.description = tpl["description"]
        t.save(
            using=_USING,
            update_fields=["form_schema", "mandatory_fields", "description"],
        )
        updated += 1
    return updated


def preview_next_customer_code() -> str:
    return catalog_service._next_code("CUS", Customer)


def check_customer_duplicate(
    *,
    phone: str = "",
    national_id: str = "",
    exclude_id=None,
) -> dict:
    warnings = []
    qs = Customer.objects.using(_USING).filter(is_active=True)
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    phone_norm = "".join(c for c in (phone or "") if c.isdigit())
    if phone_norm and len(phone_norm) >= 8:
        for c in qs.filter(phone__icontains=phone_norm[-8:])[:5]:
            if "".join(x for x in c.phone if x.isdigit()).endswith(phone_norm[-8:]):
                warnings.append(
                    {
                        "field": "phone",
                        "customer_id": str(c.pk),
                        "customer_code": c.code,
                        "customer_name": c.name_ar,
                        "message": f"رقم هاتف مشابه: {c.code} — {c.name_ar}",
                    }
                )
    nid = "".join(c for c in (national_id or "") if c.isdigit())
    if nid and len(nid) == 14:
        dup = qs.filter(national_id=nid).first()
        if dup:
            warnings.append(
                {
                    "field": "national_id",
                    "customer_id": str(dup.pk),
                    "customer_code": dup.code,
                    "customer_name": dup.name_ar,
                    "message": f"الرقم القومي مسجل مسبقاً: {dup.code}",
                }
            )
    return {"has_duplicate": len(warnings) > 0, "warnings": warnings}


def log_customer_activity(customer_id, action: str, summary: str, user=None):
    CustomerActivityLog.objects.using(_USING).create(
        customer_id=customer_id,
        action=action,
        summary=summary[:500],
        user=user,
    )


def _apply_customer_payload(c: Customer, data: dict, profile: dict):
    """مزامنة الحقول الأساسية من profile_data."""
    if c.customer_type.slug == CustomerType.Slug.INDIVIDUAL:
        nid = profile.get("national_id") or data.get("national_id") or ""
        nid_digits = "".join(x for x in str(nid) if x.isdigit())
        if nid_digits:
            parsed = validate_egyptian_national_id(nid_digits)
            if not parsed["valid"]:
                raise ValidationError(parsed.get("error", "رقم قومي غير صالح"))
            c.national_id = nid_digits
            profile.setdefault("gender", parsed["gender"])
            profile.setdefault("birth_date", parsed["birth_date"])
        name = profile.get("full_name_quad") or data.get("name_ar") or c.name_ar
        if name:
            c.name_ar = str(name).strip()
    if c.customer_type.slug == CustomerType.Slug.SHOP:
        shop = profile.get("shop_name") or data.get("name_ar")
        if shop:
            c.name_ar = str(shop).strip()
        c.phone = str(
            profile.get("owner_phone") or data.get("phone") or c.phone or ""
        ).strip()
    else:
        c.phone = str(profile.get("phone") or data.get("phone") or c.phone or "").strip()

    c.whatsapp = str(profile.get("whatsapp") or data.get("whatsapp") or c.whatsapp or "")
    c.email = str(profile.get("email") or data.get("email") or c.email or "")
    c.governorate = str(profile.get("governorate") or c.governorate or "")
    c.city = str(profile.get("city") or c.city or "")
    c.district = str(profile.get("district") or c.district or "")
    addr = profile.get("address_detail") or data.get("address") or ""
    if addr:
        c.address = str(addr)
    gps = profile.get("gps_location") or ""
    if isinstance(gps, str) and "," in gps:
        parts = gps.split(",", 1)
        try:
            c.gps_lat = Decimal(parts[0].strip())
            c.gps_lng = Decimal(parts[1].strip())
        except Exception:
            pass
    elif isinstance(gps, dict):
        if gps.get("lat") is not None:
            c.gps_lat = Decimal(str(gps["lat"]))
        if gps.get("lng") is not None:
            c.gps_lng = Decimal(str(gps["lng"]))
    c.route_line = str(profile.get("route_line") or c.route_line or "")
    c.customer_rating = int(profile.get("customer_rating") or c.customer_rating or 0)
    c.is_stopped = bool(profile.get("is_stopped") or data.get("is_stopped"))
    c.stop_reason = str(profile.get("stop_reason") or data.get("stop_reason") or "")
    c.uses_consignment = bool(
        profile.get("uses_consignment") or data.get("uses_consignment")
    )
    if "credit_score" in data:
        c.credit_score = int(data["credit_score"])
    elif profile.get("credit_score_display"):
        try:
            c.credit_score = int(profile["credit_score_display"])
        except (TypeError, ValueError):
            pass
    g1 = str(profile.get("guarantor_1_name") or "").strip()
    if g1:
        profile["guarantor_name"] = g1
    elif profile.get("guarantor_name") and not g1:
        profile["guarantor_1_name"] = str(profile["guarantor_name"]).strip()
    if profile.get("marital_status") != "married":
        profile.pop("spouse_name", None)
    c.profile_data = profile


def customer_meta() -> dict:
    sync_system_customer_types()
    types = CustomerType.objects.using(_USING).filter(is_active=True).order_by("code")
    groups = CustomerGroup.objects.using(_USING).filter(is_active=True).order_by("tree_path")
    return {
        "types": [_serialize_type(t) for t in types],
        "groups": [_serialize_group(g) for g in groups],
        "field_catalog": FIELD_CATALOG,
        "default_workflow": DEFAULT_WORKFLOW,
        "default_visibility": DEFAULT_VISIBILITY,
        "payment_policies": [
            {"key": c[0], "label_ar": c[1], "label_en": c[1]}
            for c in CustomerGroup.PaymentPolicy.choices
        ],
        "risk_levels": [
            {"key": c[0], "label_ar": c[1]} for c in CustomerGroup.RiskLevel.choices
        ],
        "volume_tiers": [
            {"key": c[0], "label_ar": c[1]} for c in CustomerGroup.VolumeTier.choices
        ],
    }


def list_customer_types(*, include_inactive=False) -> list[dict]:
    qs = CustomerType.objects.using(_USING).all()
    if not include_inactive:
        qs = qs.filter(is_active=True)
    return [_serialize_type(t) for t in qs.order_by("code")]


def create_customer_type(data: dict) -> dict:
    code = (data.get("code") or "").strip() or catalog_service._next_code("CT", CustomerType)
    slug = data.get("slug") or CustomerType.Slug.INDIVIDUAL
    if CustomerType.objects.using(_USING).filter(slug=slug, is_active=True).exclude(
        code=code
    ).exists():
        if data.get("is_system"):
            pass
    t = CustomerType.objects.using(_USING).create(
        code=code,
        slug=slug,
        name_ar=data["name_ar"],
        name_en=data.get("name_en", ""),
        description=data.get("description", ""),
        mandatory_fields=data.get("mandatory_fields") or [],
        field_visibility=data.get("field_visibility") or DEFAULT_VISIBILITY,
        workflow_steps=data.get("workflow_steps") or DEFAULT_WORKFLOW,
        form_schema=data.get("form_schema") or [],
        is_system=bool(data.get("is_system", False)),
        is_active=bool(data.get("is_active", True)),
    )
    return _serialize_type(t)


def update_customer_type(pk, data: dict) -> dict:
    t = CustomerType.objects.using(_USING).get(pk=pk)
    for field in (
        "name_ar",
        "name_en",
        "description",
        "mandatory_fields",
        "field_visibility",
        "workflow_steps",
        "form_schema",
        "is_active",
    ):
        if field in data:
            setattr(t, field, data[field])
    if "slug" in data and not t.is_system:
        t.slug = data["slug"]
    t.save(using=_USING)
    return _serialize_type(t)


def list_customer_groups(*, include_inactive=False) -> list[dict]:
    qs = CustomerGroup.objects.using(_USING).select_related("parent", "salesperson")
    if not include_inactive:
        qs = qs.filter(is_active=True)
    return [_serialize_group(g) for g in qs.order_by("tree_path", "code")]


def create_customer_group(data: dict) -> dict:
    code = (data.get("code") or "").strip() or catalog_service._next_code("CG", CustomerGroup)
    g = CustomerGroup.objects.using(_USING).create(
        code=code,
        name_ar=data["name_ar"],
        name_en=data.get("name_en", ""),
        parent_id=data.get("parent") or None,
        default_discount_percent=Decimal(str(data.get("default_discount_percent") or 0)),
        default_payment_policy=data.get(
            "default_payment_policy", CustomerGroup.PaymentPolicy.CASH
        ),
        default_credit_limit=Decimal(str(data.get("default_credit_limit") or 0)),
        region=data.get("region", ""),
        salesperson_id=data.get("salesperson") or None,
        risk_level=data.get("risk_level", CustomerGroup.RiskLevel.MEDIUM),
        volume_tier=data.get("volume_tier", CustomerGroup.VolumeTier.MEDIUM),
        notes=data.get("notes", ""),
        display_color=(data.get("display_color") or "#4F46E5").strip(),
        is_system=bool(data.get("is_system", False)),
    )
    _rebuild_group_tree(g)
    return _serialize_group(
        CustomerGroup.objects.using(_USING).select_related("parent", "salesperson").get(pk=g.pk)
    )


def update_customer_group(pk, data: dict) -> dict:
    g = CustomerGroup.objects.using(_USING).get(pk=pk)
    if "parent" in data:
        g.parent_id = data["parent"] or None
    for field in (
        "name_ar",
        "name_en",
        "default_discount_percent",
        "default_payment_policy",
        "default_credit_limit",
        "region",
        "risk_level",
        "volume_tier",
        "notes",
        "display_color",
        "is_active",
    ):
        if field in data:
            val = data[field]
            if field in ("default_discount_percent", "default_credit_limit"):
                val = Decimal(str(val))
            setattr(g, field, val)
    if "salesperson" in data:
        g.salesperson_id = data["salesperson"] or None
    g.save(using=_USING)
    _rebuild_group_tree(g)
    return _serialize_group(
        CustomerGroup.objects.using(_USING).select_related("parent", "salesperson").get(pk=pk)
    )


def _group_stats(group_id) -> dict:
    from erp.sale_models import Sale

    cust_qs = Customer.objects.using(_USING).filter(customer_group_id=group_id, is_active=True)
    agg = cust_qs.aggregate(
        customers_count=Count("id"),
        total_sales=Sum("total_sales"),
        balance_due=Sum("balance_due"),
        total_collected=Sum("total_collected"),
    )
    count = agg["customers_count"] or 0
    total_sales = (agg["total_sales"] or Decimal("0")).quantize(_QUANT)
    balance_due = (agg["balance_due"] or Decimal("0")).quantize(_QUANT)
    total_collected = (agg["total_collected"] or Decimal("0")).quantize(_QUANT)

    sale_total = Decimal("0")
    try:
        sale_agg = (
            Sale.objects.using(_USING)
            .filter(customer__customer_group_id=group_id, status=Sale.Status.COMPLETED)
            .aggregate(s=Sum("total"))
        )
        sale_total = (sale_agg["s"] or Decimal("0")).quantize(_QUANT)
    except Exception:
        pass
    if sale_total > total_sales:
        total_sales = sale_total

    avg_collection = Decimal("0")
    if total_sales > 0:
        avg_collection = ((total_collected / total_sales) * 100).quantize(_QUANT)

    since = timezone.now() - timedelta(days=30)
    active_count = cust_qs.filter(last_activity_at__gte=since).count()
    activity_rate = Decimal("0")
    if count > 0:
        activity_rate = (Decimal(active_count) / Decimal(count) * 100).quantize(_QUANT)

    return {
        "customers_count": count,
        "total_sales": str(total_sales),
        "balance_due": str(balance_due),
        "avg_collection_percent": str(avg_collection),
        "activity_rate_percent": str(activity_rate),
        "active_last_30_days": active_count,
    }


def groups_dashboard() -> dict:
    groups = (
        CustomerGroup.objects.using(_USING)
        .filter(is_active=True)
        .select_related("parent", "salesperson")
        .order_by("tree_path")
    )
    rows = []
    totals = {
        "customers_count": 0,
        "total_sales": Decimal("0"),
        "balance_due": Decimal("0"),
    }
    for g in groups:
        stats = _group_stats(g.pk)
        rows.append(_serialize_group(g, stats=stats))
        totals["customers_count"] += stats["customers_count"]
        totals["total_sales"] += Decimal(stats["total_sales"])
        totals["balance_due"] += Decimal(stats["balance_due"])
    return {
        "groups": rows,
        "totals": {
            "customers_count": totals["customers_count"],
            "total_sales": str(totals["total_sales"].quantize(_QUANT)),
            "balance_due": str(totals["balance_due"].quantize(_QUANT)),
        },
    }


def _validate_profile(customer_type: CustomerType, profile: dict, core: dict):
    mandatory = set(customer_type.mandatory_fields or [])
    for key in mandatory:
        val = profile.get(key) or core.get(key)
        if val is None or str(val).strip() == "":
            raise ValidationError(f"الحقل الإلزامي: {key}")


def _resolve_display_name(customer_type: CustomerType, profile: dict, core: dict) -> str:
    if customer_type.slug == CustomerType.Slug.ESTABLISHMENT:
        return (profile.get("company_name") or core.get("name_ar") or "").strip() or "—"
    if customer_type.slug == CustomerType.Slug.SHOP:
        return (profile.get("shop_name") or core.get("name_ar") or "").strip() or "—"
    if customer_type.slug == CustomerType.Slug.INDIVIDUAL:
        return (profile.get("full_name_quad") or core.get("name_ar") or "").strip() or "—"
    return (core.get("name_ar") or profile.get("name_ar") or "").strip() or "—"


def list_customers(*, group_id=None, type_id=None) -> list[dict]:
    qs = Customer.objects.using(_USING).select_related(
        "customer_type", "customer_group", "assigned_salesperson"
    )
    if group_id:
        qs = qs.filter(customer_group_id=group_id)
    if type_id:
        qs = qs.filter(customer_type_id=type_id)
    return [_serialize_customer(c) for c in qs.filter(is_active=True).order_by("code")]


def _serialize_customer(c: Customer, *, include_activities=False) -> dict:
    gps = None
    if c.gps_lat is not None and c.gps_lng is not None:
        gps = f"{c.gps_lat},{c.gps_lng}"
    profile = dict(c.profile_data or {})
    if gps:
        profile.setdefault("gps_location", gps)
    row = {
        "id": str(c.pk),
        "code": c.code,
        "customer_type": str(c.customer_type_id),
        "customer_type_slug": c.customer_type.slug,
        "customer_type_name": c.customer_type.name_ar,
        "customer_group": str(c.customer_group_id),
        "customer_group_name": c.customer_group.name_ar,
        "customer_group_path": c.customer_group.path_label,
        "customer_group_color": getattr(c.customer_group, "display_color", None) or "#4F46E5",
        "name_ar": c.name_ar,
        "name_en": c.name_en,
        "phone": c.phone,
        "whatsapp": c.whatsapp,
        "email": c.email,
        "address": c.address,
        "workflow_status": c.workflow_status,
        "profile_data": profile,
        "national_id": c.national_id,
        "governorate": c.governorate,
        "city": c.city,
        "district": c.district,
        "gps_lat": str(c.gps_lat) if c.gps_lat is not None else None,
        "gps_lng": str(c.gps_lng) if c.gps_lng is not None else None,
        "barcode": c.barcode or c.code,
        "credit_score": c.credit_score,
        "purchase_count": c.purchase_count,
        "avg_purchase_amount": str(c.avg_purchase_amount),
        "is_stopped": c.is_stopped,
        "stop_reason": c.stop_reason,
        "uses_consignment": c.uses_consignment,
        "route_line": c.route_line,
        "customer_rating": c.customer_rating,
        "credit_limit": str(c.credit_limit),
        "discount_percent": str(c.discount_percent),
        "payment_policy": c.payment_policy,
        "balance_due": str(c.balance_due),
        "total_sales": str(c.total_sales),
        "total_collected": str(c.total_collected),
        "last_activity_at": c.last_activity_at.isoformat() if c.last_activity_at else None,
        "assigned_salesperson": str(c.assigned_salesperson_id)
        if c.assigned_salesperson_id
        else None,
        "assigned_salesperson_name": (
            (c.assigned_salesperson.full_name or c.assigned_salesperson.username)
            if c.assigned_salesperson_id
            else None
        ),
        "notes": c.notes,
        "is_active": c.is_active,
        "spouse_name": profile_spouse(profile),
        "guarantor_summary": profile_guarantor_summary(profile),
        "phone_verified": bool(profile.get("phone_verified")),
        "form_schema": _enrich_form_schema(c.customer_type.form_schema or []),
        "workflow_steps": c.customer_type.workflow_steps or [],
        "mandatory_fields": c.customer_type.mandatory_fields or [],
    }
    if include_activities:
        row["activities"] = [
            {
                "id": str(a.pk),
                "action": a.action,
                "summary": a.summary,
                "created_at": a.created_at.isoformat(),
                "user_name": (
                    (a.user.full_name or a.user.username) if a.user_id else None
                ),
            }
            for a in c.activity_logs.select_related("user").all()[:50]
        ]
        row["attachments"] = [
            {
                "id": str(att.pk),
                "kind": att.kind,
                "original_name": att.original_name,
                "url": att.file.url if att.file else None,
                "uploaded_at": att.uploaded_at.isoformat(),
            }
            for att in c.attachments.all()[:20]
        ]
    return row


def create_customer(data: dict, user) -> dict:
    ct = CustomerType.objects.using(_USING).get(pk=data["customer_type"], is_active=True)
    cg = CustomerGroup.objects.using(_USING).get(pk=data["customer_group"], is_active=True)
    profile = dict(data.get("profile_data") or {})
    core = {
        "name_ar": data.get("name_ar", ""),
        "phone": data.get("phone", ""),
        "email": data.get("email", ""),
        "address": data.get("address", ""),
    }
    dup = check_customer_duplicate(
        phone=profile.get("owner_phone") or profile.get("phone") or core.get("phone"),
        national_id=profile.get("national_id", ""),
    )
    if dup["has_duplicate"] and data.get("allow_duplicate") is not True:
        raise ValidationError({"duplicate": dup["warnings"]})
    _validate_profile(ct, profile, core)
    name_ar = _resolve_display_name(ct, profile, core)
    code = catalog_service._next_code("CUS", Customer)
    wf = (ct.workflow_steps or DEFAULT_WORKFLOW)[0]["key"] if ct.workflow_steps else "draft"
    c = Customer.objects.using(_USING).create(
        code=code,
        customer_type=ct,
        customer_group=cg,
        name_ar=name_ar,
        name_en=data.get("name_en", ""),
        phone=data.get("phone", ""),
        whatsapp=data.get("whatsapp", ""),
        email=data.get("email", ""),
        address=data.get("address", ""),
        workflow_status=data.get("workflow_status") or wf,
        profile_data=profile,
        credit_limit=Decimal(
            str(data.get("credit_limit") or profile.get("credit_limit") or cg.default_credit_limit or 0)
        ),
        discount_percent=Decimal(
            str(data.get("discount_percent") or profile.get("discount_percent") or cg.default_discount_percent or 0)
        ),
        payment_policy=data.get("payment_policy")
        or profile.get("payment_days")
        or cg.default_payment_policy,
        assigned_salesperson_id=data.get("assigned_salesperson") or cg.salesperson_id,
        notes=data.get("notes", profile.get("notes", "")),
        credit_score=int(data.get("credit_score") or 0),
        barcode=code,
        created_by=user,
        last_activity_at=timezone.now(),
    )
    _apply_customer_payload(c, data, profile)
    c.save(using=_USING)
    log_customer_activity(c.pk, "created", f"إنشاء عميل {c.code}", user)
    return _serialize_customer(
        Customer.objects.using(_USING)
        .select_related("customer_type", "customer_group", "assigned_salesperson")
        .get(pk=c.pk),
        include_activities=True,
    )


def update_customer(pk, data: dict, user=None) -> dict:
    c = Customer.objects.using(_USING).select_related("customer_type").get(pk=pk)
    profile = dict(c.profile_data or {})
    if "profile_data" in data:
        profile.update(data["profile_data"] or {})
    dup = check_customer_duplicate(
        phone=profile.get("owner_phone") or profile.get("phone") or c.phone,
        national_id=profile.get("national_id") or c.national_id,
        exclude_id=pk,
    )
    if dup["has_duplicate"] and data.get("allow_duplicate") is not True:
        raise ValidationError({"duplicate": dup["warnings"]})
    for field in (
        "name_ar",
        "name_en",
        "phone",
        "whatsapp",
        "email",
        "address",
        "workflow_status",
        "credit_limit",
        "discount_percent",
        "payment_policy",
        "notes",
        "is_active",
        "credit_score",
        "is_stopped",
        "stop_reason",
        "uses_consignment",
        "route_line",
        "customer_rating",
    ):
        if field in data:
            val = data[field]
            if field in ("credit_limit", "discount_percent"):
                val = Decimal(str(val))
            setattr(c, field, val)
    if "customer_group" in data:
        c.customer_group_id = data["customer_group"]
    if "assigned_salesperson" in data:
        c.assigned_salesperson_id = data["assigned_salesperson"] or None
    _apply_customer_payload(c, data, profile)
    _validate_profile(
        c.customer_type,
        c.profile_data or {},
        {
            "name_ar": c.name_ar,
            "phone": c.phone,
            "address": c.address,
        },
    )
    c.name_ar = _resolve_display_name(
        c.customer_type, c.profile_data or {}, {"name_ar": c.name_ar}
    )
    c.last_activity_at = timezone.now()
    c.save(using=_USING)
    log_customer_activity(c.pk, "updated", f"تحديث بيانات {c.code}", user)
    return _serialize_customer(
        Customer.objects.using(_USING)
        .select_related("customer_type", "customer_group", "assigned_salesperson")
        .get(pk=pk),
        include_activities=True,
    )


def get_customer_detail(pk) -> dict:
    c = (
        Customer.objects.using(_USING)
        .select_related("customer_type", "customer_group", "assigned_salesperson")
        .get(pk=pk, is_active=True)
    )
    return _serialize_customer(c, include_activities=True)


def upload_customer_attachment(customer_id, file, kind: str = "", original_name: str = ""):
    att = CustomerAttachment.objects.using(_USING).create(
        customer_id=customer_id,
        kind=kind,
        file=file,
        original_name=original_name or getattr(file, "name", ""),
    )
    return {
        "id": str(att.pk),
        "kind": att.kind,
        "original_name": att.original_name,
        "url": att.file.url if att.file else None,
    }


def get_customer_type_form(pk) -> dict:
    t = CustomerType.objects.using(_USING).get(pk=pk, is_active=True)
    return _serialize_type(t)


def customer_purchase_items(*, customer_id) -> list[dict]:
    from erp.sale_models import Sale, SaleLine

    lines = (
        SaleLine.objects.using(_USING)
        .filter(sale__customer_id=customer_id, sale__status=Sale.Status.COMPLETED)
        .select_related(
            "sale",
            "variant__product",
            "variant__size",
            "variant__color",
            "composite_product",
        )
        .order_by("-sale__created_at")[:300]
    )
    rows = []
    for ln in lines:
        if ln.variant_id:
            name = ln.variant.product.name_ar
            size = ln.variant.size.name_ar
            color = ln.variant.color.name_ar
            code = ln.variant.product.code
        elif ln.composite_product_id:
            name = ln.composite_product.name_ar
            size = color = "—"
            code = ln.composite_product.code
        else:
            continue
        rows.append(
            {
                "sale_id": str(ln.sale_id),
                "sale_code": ln.sale.code,
                "sale_date": ln.sale.created_at.date().isoformat(),
                "product_code": code,
                "product_name": name,
                "size_name": size,
                "color_name": color,
                "quantity": str(ln.quantity),
                "unit_price": str(ln.unit_price),
                "line_total": str(ln.line_total),
            }
        )
    return rows
