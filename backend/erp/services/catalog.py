"""خدمات التكويد والكتالوج."""

from __future__ import annotations

import re
import secrets
from decimal import Decimal

from django.db import transaction
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from erp.catalog_models import (
    Brand,
    ProductClassification,
    ProductColor,
    ProductSection,
    ProductSize,
)
from erp.models import InventorySettings, Season, Warehouse
from erp.product_models import Product, ProductVariant, StockBalance
from erp.supplier_models import Supplier, SupplierGroup, SupplierType


def _next_code(prefix: str, model, field: str = "code") -> str:
    existing = (
        model.objects.using("tenant")
        .filter(**{f"{field}__startswith": prefix})
        .order_by(f"-{field}")
        .values_list(field, flat=True)
        .first()
    )
    n = 1
    if existing:
        try:
            n = int(str(existing).split("-")[-1]) + 1
        except ValueError:
            n = model.objects.using("tenant").count() + 1
    return f"{prefix}-{n:03d}"


def create_catalog_item(model, *, name_ar: str, name_en: str = "", code: str | None = None, **extra):
    name_ar = (name_ar or "").strip()
    name_en = (name_en or "").strip()
    code_hint = (code or "").strip()
    if not name_ar and name_en:
        name_ar = name_en
    if not name_ar and code_hint:
        name_ar = code_hint
    if not name_ar:
        raise ValidationError("الاسم مطلوب.")
    prefix_map = {
        ProductSection: "SEC",
        Brand: "BR",
        ProductClassification: "CLS",
        ProductSize: "SZ",
        ProductColor: "CLR",
        SupplierType: "ST",
        SupplierGroup: "SG",
        Supplier: "SUP",
    }
    prefix = prefix_map.get(model, "COD")
    final_code = (code or "").strip() or _next_code(prefix, model)
    if model.objects.using("tenant").filter(code=final_code).exists():
        raise ValidationError("الكود مستخدم بالفعل.")
    if model is Supplier:
        extra.setdefault("is_also_customer", False)
    return model.objects.using("tenant").create(
        code=final_code,
        name_ar=name_ar,
        name_en=(name_en or name_ar).strip(),
        **extra,
    )


def update_catalog_item(instance, *, name_ar: str | None = None, name_en: str | None = None, **extra):
    if name_ar is not None:
        instance.name_ar = name_ar.strip()
    if name_en is not None:
        instance.name_en = name_en.strip()
    for key, value in extra.items():
        setattr(instance, key, value)
    instance.save(using="tenant")
    return instance


def soft_delete(instance):
    instance.is_active = False
    instance.save(using="tenant", update_fields=["is_active", "updated_at"] if hasattr(instance, "updated_at") else ["is_active"])
    return instance


def compute_sale_price(purchase: Decimal, markup_percent: Decimal) -> Decimal:
    if purchase <= 0:
        return Decimal("0")
    return (purchase * (Decimal("1") + markup_percent / Decimal("100"))).quantize(Decimal("0.01"))


def compute_markup_percent(purchase: Decimal, sale: Decimal) -> Decimal:
    if purchase <= 0:
        return Decimal("0")
    return (((sale / purchase) - Decimal("1")) * Decimal("100")).quantize(Decimal("0.01"))


def get_inventory_settings() -> InventorySettings:
    settings, _ = InventorySettings.objects.using("tenant").get_or_create(pk=1)
    return settings


def get_default_reorder_percent() -> Decimal:
    return get_inventory_settings().default_reorder_percent


def _barcode_part(value: str, fallback: str = "X") -> str:
    raw = (value or fallback).strip().upper()
    cleaned = re.sub(r"[^A-Z0-9]", "", raw)
    return cleaned or fallback


def build_barcode_prefix(
    *,
    season: Season,
    size: ProductSize | None = None,
    color: ProductColor | None = None,
) -> str:
    """موسم + مقاس + لون (بدون الجزء العشوائي)."""
    parts = [_barcode_part(season.barcode_prefix or season.code, "S")]
    if size is not None:
        parts.append(_barcode_part(size.code, "SZ"))
    if color is not None:
        parts.append(_barcode_part(color.code, "CLR"))
    return "".join(parts)


def _random_barcode_suffix(length: int = 5) -> str:
    return f"{secrets.randbelow(10**length):0{length}d}"


def _barcode_exists(barcode: str) -> bool:
    if not barcode:
        return False
    return (
        Product.objects.using("tenant").filter(barcode=barcode).exists()
        or ProductVariant.objects.using("tenant").filter(barcode=barcode).exists()
    )


def allocate_unique_barcode(prefix: str) -> str:
    for _ in range(80):
        candidate = f"{prefix}{_random_barcode_suffix()}"
        if not _barcode_exists(candidate):
            return candidate
    raise ValidationError("تعذر توليد باركود فريد — جرّب تقليل التكرار.")


def peek_variant_barcode(
    season: Season,
    size: ProductSize | None = None,
    color: ProductColor | None = None,
) -> str:
    """معاينة فقط — قد يختلف عند الحفظ الفعلي."""
    prefix = build_barcode_prefix(season=season, size=size, color=color)
    return f"{prefix}{_random_barcode_suffix()}"


def allocate_variant_barcode(
    season: Season,
    size: ProductSize,
    color: ProductColor,
) -> str:
    prefix = build_barcode_prefix(season=season, size=size, color=color)
    return allocate_unique_barcode(prefix)


@transaction.atomic(using="tenant")
def allocate_barcode(
    season: Season,
    *,
    size: ProductSize | None = None,
    color: ProductColor | None = None,
) -> str:
    """باركود: كود الموسم + المقاس + اللون + أرقام عشوائية."""
    if size is not None and color is not None:
        return allocate_variant_barcode(season, size, color)
    prefix = build_barcode_prefix(season=season, size=size, color=color)
    return allocate_unique_barcode(prefix)


def peek_next_barcode(
    season: Season,
    *,
    size: ProductSize | None = None,
    color: ProductColor | None = None,
) -> str:
    return peek_variant_barcode(season, size=size, color=color)


def barcode_previews(
    *,
    season_id: str,
    size_ids: list | None = None,
    color_ids: list | None = None,
) -> list[dict]:
    season = Season.objects.using("tenant").get(pk=season_id)
    size_ids = size_ids or []
    color_ids = color_ids or []
    sizes = list(
        ProductSize.objects.using("tenant").filter(pk__in=size_ids, is_active=True).order_by("code")
    )
    colors = list(
        ProductColor.objects.using("tenant").filter(pk__in=color_ids, is_active=True).order_by("code")
    )
    rows: list[dict] = []
    if sizes and colors:
        for size in sizes:
            for color in colors:
                rows.append(
                    {
                        "size_id": str(size.id),
                        "color_id": str(color.id),
                        "size_code": size.code,
                        "color_code": color.code,
                        "size_name": size.name_ar,
                        "color_name": color.name_ar,
                        "barcode_preview": peek_variant_barcode(season, size=size, color=color),
                    }
                )
    else:
        rows.append(
            {
                "barcode_preview": peek_next_barcode(season),
                "prefix": build_barcode_prefix(season=season),
            }
        )
    return rows


def get_current_season() -> Season:
    season = Season.objects.using("tenant").filter(is_current=True, is_open=True).first()
    if not season:
        raise ValidationError("لا يوجد موسم حالي مفتوح — عرّف موسمًا من شاشة المواسم.")
    return season


@transaction.atomic(using="tenant")
def create_product(*, data: dict) -> Product:
    season_id = data.get("season")
    if season_id:
        season = Season.objects.using("tenant").get(pk=season_id)
    else:
        season = get_current_season()

    purchase = Decimal(str(data.get("purchase_price") or 0))
    markup = Decimal(str(data.get("markup_percent") or 0))
    sale = data.get("sale_price")
    sale_price = Decimal(str(sale)) if sale is not None else compute_sale_price(purchase, markup)

    code = (data.get("code") or "").strip() or _next_code("PRD", Product)
    barcode = (data.get("barcode") or "").strip()
    size_ids = data.get("size_ids") or []
    color_ids = data.get("color_ids") or []
    if not barcode:
        if len(size_ids) == 1 and len(color_ids) == 1:
            size = ProductSize.objects.using("tenant").get(pk=size_ids[0])
            color = ProductColor.objects.using("tenant").get(pk=color_ids[0])
            barcode = allocate_variant_barcode(season, size, color)
        else:
            barcode = allocate_barcode(season)
    reorder = data.get("reorder_percent")
    if reorder is None or reorder == "":
        reorder = get_default_reorder_percent()
    product = Product.objects.using("tenant").create(
        code=code,
        barcode=barcode,
        name_ar=data["name_ar"].strip(),
        name_en=(data.get("name_en") or data["name_ar"]).strip(),
        description=(data.get("description") or "").strip(),
        brand_id=data.get("brand") or None,
        section_id=data.get("section") or None,
        classification_id=data.get("classification") or None,
        supplier_id=data.get("supplier") or None,
        season=season,
        purchase_price=purchase,
        markup_percent=markup,
        sale_price=sale_price,
        offer_price=data.get("offer_price"),
        reorder_percent=Decimal(str(reorder)),
    )
    if size_ids and color_ids:
        sync_product_variants(product, size_ids=size_ids, color_ids=color_ids)
    return product


@transaction.atomic(using="tenant")
def sync_product_variants(
    product: Product,
    *,
    size_ids: list | None = None,
    color_ids: list | None = None,
) -> list[ProductVariant]:
    """ينشئ متغيرات (مقاس×لون) وأرصدة صفر لكل مخزن نشط."""
    sizes = size_ids or []
    colors = color_ids or []
    if not sizes or not colors:
        return list(product.variants.filter(is_active=True))

    season = product.season
    size_map = {
        s.id: s
        for s in ProductSize.objects.using("tenant").filter(pk__in=sizes, is_active=True)
    }
    color_map = {
        c.id: c
        for c in ProductColor.objects.using("tenant").filter(pk__in=colors, is_active=True)
    }

    created: list[ProductVariant] = []
    for size_id in sizes:
        for color_id in colors:
            size_obj = size_map.get(size_id)
            color_obj = color_map.get(color_id)
            if not size_obj or not color_obj:
                continue
            variant, _ = ProductVariant.objects.using("tenant").get_or_create(
                product=product,
                size_id=size_id,
                color_id=color_id,
                defaults={"is_active": True},
            )
            updates: list[str] = []
            if not variant.is_active:
                variant.is_active = True
                updates.append("is_active")
            if not (variant.barcode or "").strip():
                variant.barcode = allocate_variant_barcode(season, size_obj, color_obj)
                updates.append("barcode")
            if updates:
                variant.save(using="tenant", update_fields=updates)
            ensure_variant_balances(variant)
            created.append(variant)
    return created


def ensure_variant_balances(variant: ProductVariant, warehouse_ids: list | None = None):
    """ينشئ صف رصيد صفر لكل مخزن نشط."""
    qs = Warehouse.objects.using("tenant").filter(is_active=True)
    if warehouse_ids:
        qs = qs.filter(pk__in=warehouse_ids)
    for wh in qs:
        StockBalance.objects.using("tenant").get_or_create(
            warehouse=wh,
            variant=variant,
            defaults={"quantity": Decimal("0")},
        )
