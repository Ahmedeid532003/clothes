"""بيانات أساسية للمنتجات — أقسام، براند، تصنيفات، مقاسات، ألوان."""

import uuid

from django.db import models


class CatalogCodeModel(models.Model):
    """أساس للتكويد اللا نهائي."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name_ar}"


class ProductSection(CatalogCodeModel):
    """قسم منتجات: حريمي، رجالي، أطفال، أحذية..."""

    class Meta(CatalogCodeModel.Meta):
        verbose_name = "قسم منتجات"
        verbose_name_plural = "أقسام المنتجات"


class Brand(CatalogCodeModel):
    class Meta(CatalogCodeModel.Meta):
        verbose_name = "علامة تجارية"
        verbose_name_plural = "العلامات التجارية"


class ProductClassification(CatalogCodeModel):
    """تصنيف: بنطلون، عباية..."""

    section = models.ForeignKey(
        ProductSection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="classifications",
    )

    class Meta(CatalogCodeModel.Meta):
        verbose_name = "تصنيف منتج"
        verbose_name_plural = "تصنيفات المنتجات"


class ProductSize(CatalogCodeModel):
    class Meta(CatalogCodeModel.Meta):
        verbose_name = "مقاس"
        verbose_name_plural = "المقاسات"


class ProductColor(CatalogCodeModel):
    hex_code = models.CharField(max_length=7, blank=True)

    class Meta(CatalogCodeModel.Meta):
        verbose_name = "لون"
        verbose_name_plural = "الألوان"
