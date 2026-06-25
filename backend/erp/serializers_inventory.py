from decimal import Decimal

from rest_framework import serializers

from erp.services.inventory_extended import _variant_unit_price
from erp.catalog_models import (
    Brand,
    ProductClassification,
    ProductColor,
    ProductSection,
    ProductSize,
)
from erp.models import Branch, InventorySettings, Season, Warehouse
from erp.product_models import (
    CompositeProduct,
    CompositeProductLine,
    PriceAdjustment,
    Product,
    ProductVariant,
    StockBalance,
    StockCount,
    StockCountLine,
    StockAddition,
    StockAdditionLine,
    StockDisbursement,
    StockDisbursementLine,
    StockScrap,
    StockScrapLine,
    StockTransfer,
    StockTransferLine,
)
from erp.services.catalog import compute_sale_price
from erp.supplier_models import (
    Supplier,
    SupplierCategory,
    SupplierDepartment,
    SupplierGroup,
    SupplierPayment,
    SupplierType,
)


class CatalogSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ("id", "code", "name_ar", "name_en", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "code", "created_at", "updated_at")


class ProductSectionSerializer(CatalogSerializer):
    class Meta(CatalogSerializer.Meta):
        model = ProductSection


class BrandSerializer(CatalogSerializer):
    class Meta(CatalogSerializer.Meta):
        model = Brand


class ProductClassificationSerializer(CatalogSerializer):
    section = serializers.UUIDField(source="section_id", allow_null=True, required=False)
    section_name = serializers.CharField(source="section.name_ar", read_only=True)

    class Meta(CatalogSerializer.Meta):
        model = ProductClassification
        fields = CatalogSerializer.Meta.fields + ("section", "section_name")


class ProductSizeSerializer(CatalogSerializer):
    class Meta(CatalogSerializer.Meta):
        model = ProductSize


class ProductColorSerializer(CatalogSerializer):
    hex_code = serializers.CharField(required=False, allow_blank=True)

    class Meta(CatalogSerializer.Meta):
        model = ProductColor
        fields = CatalogSerializer.Meta.fields + ("hex_code",)


class SupplierCatalogSerializer(serializers.ModelSerializer):
    """أنواع/مجموعات الموردين — بدون updated_at (غير موجود على النموذج)."""

    class Meta:
        fields = ("id", "code", "name_ar", "name_en", "is_active", "created_at")
        read_only_fields = ("id", "code", "created_at")


class SupplierTypeSerializer(SupplierCatalogSerializer):
    entity_kind_label = serializers.CharField(
        source="get_entity_kind_display", read_only=True
    )

    class Meta(SupplierCatalogSerializer.Meta):
        model = SupplierType
        fields = SupplierCatalogSerializer.Meta.fields + (
            "entity_kind",
            "entity_kind_label",
            "description",
            "is_system",
        )
        read_only_fields = SupplierCatalogSerializer.Meta.read_only_fields + ("is_system",)


class SupplierCategorySerializer(SupplierCatalogSerializer):
    category_kind_label = serializers.CharField(
        source="get_category_kind_display", read_only=True
    )

    class Meta(SupplierCatalogSerializer.Meta):
        model = SupplierCategory
        fields = SupplierCatalogSerializer.Meta.fields + (
            "category_kind",
            "category_kind_label",
            "description",
            "is_system",
        )
        read_only_fields = SupplierCatalogSerializer.Meta.read_only_fields + ("is_system",)


class SupplierDepartmentSerializer(SupplierCatalogSerializer):
    dept_kind_label = serializers.CharField(
        source="get_dept_kind_display", read_only=True
    )

    class Meta(SupplierCatalogSerializer.Meta):
        model = SupplierDepartment
        fields = SupplierCatalogSerializer.Meta.fields + (
            "dept_kind",
            "dept_kind_label",
            "description",
            "is_system",
        )
        read_only_fields = SupplierCatalogSerializer.Meta.read_only_fields + ("is_system",)


class SupplierGroupSerializer(SupplierCatalogSerializer):
    settlement_mode_label = serializers.CharField(
        source="get_settlement_mode_display", read_only=True
    )

    class Meta(SupplierCatalogSerializer.Meta):
        model = SupplierGroup
        fields = SupplierCatalogSerializer.Meta.fields + (
            "settlement_mode",
            "settlement_mode_label",
            "description",
            "is_system",
        )
        read_only_fields = SupplierCatalogSerializer.Meta.read_only_fields + ("is_system",)


class SupplierSerializer(serializers.ModelSerializer):
    supplier_type_name = serializers.CharField(source="supplier_type.name_ar", read_only=True)
    supplier_group_name = serializers.CharField(source="supplier_group.name_ar", read_only=True)
    supplier_type_kind = serializers.CharField(
        source="supplier_type.entity_kind", read_only=True
    )
    supplier_type_kind_label = serializers.CharField(
        source="supplier_type.get_entity_kind_display", read_only=True
    )
    supplier_group_mode = serializers.CharField(
        source="supplier_group.settlement_mode", read_only=True
    )
    supplier_group_mode_label = serializers.CharField(
        source="supplier_group.get_settlement_mode_display", read_only=True
    )
    supplier_category_name = serializers.CharField(
        source="supplier_category.name_ar", read_only=True, default=""
    )
    supplier_department_name = serializers.CharField(
        source="supplier_department.name_ar", read_only=True, default=""
    )
    supplier_category_kind = serializers.CharField(
        source="supplier_category.category_kind", read_only=True, default=""
    )
    supplier_department_kind = serializers.CharField(
        source="supplier_department.dept_kind", read_only=True, default=""
    )
    linked_customer_code = serializers.CharField(
        source="linked_customer.code", read_only=True, default=""
    )
    linked_customer_name = serializers.CharField(
        source="linked_customer.name_ar", read_only=True, default=""
    )

    class Meta:
        model = Supplier
        fields = (
            "id",
            "code",
            "name_ar",
            "name_en",
            "supplier_type",
            "supplier_group",
            "supplier_category",
            "supplier_department",
            "supplier_type_name",
            "supplier_group_name",
            "supplier_category_name",
            "supplier_department_name",
            "supplier_category_kind",
            "supplier_department_kind",
            "supplier_type_kind",
            "supplier_type_kind_label",
            "supplier_group_mode",
            "supplier_group_mode_label",
            "contact_name",
            "contact_title",
            "phone",
            "whatsapp",
            "weekly_inventory_day",
            "is_also_customer",
            "linked_customer",
            "linked_customer_code",
            "linked_customer_name",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "code", "created_at", "updated_at")


class SupplierPaymentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name_ar", read_only=True)
    payment_paper_id = serializers.SerializerMethodField()
    payment_paper_status = serializers.SerializerMethodField()
    payment_paper_number = serializers.SerializerMethodField()

    class Meta:
        model = SupplierPayment
        fields = (
            "id",
            "code",
            "supplier",
            "supplier_name",
            "amount",
            "payment_date",
            "payment_method",
            "status",
            "notes",
            "paper_cheque_number",
            "paper_bank_account",
            "paper_due_date",
            "payment_paper_id",
            "payment_paper_status",
            "payment_paper_number",
            "created_at",
            "approved_at",
        )
        read_only_fields = ("id", "code", "status", "created_at", "approved_at")

    def _paper(self, obj):
        return getattr(obj, "payment_paper", None)

    def get_payment_paper_id(self, obj):
        paper = self._paper(obj)
        return str(paper.pk) if paper else None

    def get_payment_paper_status(self, obj):
        paper = self._paper(obj)
        return paper.status if paper else None

    def get_payment_paper_number(self, obj):
        paper = self._paper(obj)
        return paper.cheque_number if paper else None


class SupplierPaymentWriteSerializer(serializers.Serializer):
    supplier = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    payment_date = serializers.DateField()
    payment_method = serializers.ChoiceField(
        choices=SupplierPayment.PaymentMethod.choices,
        required=False,
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(required=False, allow_blank=True)
    paper_cheque_number = serializers.CharField(required=False, allow_blank=True)
    paper_bank_account = serializers.UUIDField(required=False, allow_null=True)
    paper_due_date = serializers.DateField(required=False, allow_null=True)


class WarehouseSerializer(serializers.ModelSerializer):
    primary_branch_name = serializers.CharField(
        source="primary_branch.name_ar", read_only=True
    )
    is_sale_outlet = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = (
            "id",
            "code",
            "name_ar",
            "name_en",
            "manager_name",
            "primary_branch",
            "primary_branch_name",
            "is_sale_outlet",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "primary_branch",
            "primary_branch_name",
            "is_sale_outlet",
            "created_at",
            "updated_at",
        )

    def get_is_sale_outlet(self, obj):
        from erp.services import branches as branch_service

        return branch_service.is_sale_outlet_warehouse(obj.id)


class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = (
            "id",
            "code",
            "name_ar",
            "name_en",
            "is_open",
            "is_current",
            "starts_at",
            "ends_at",
            "barcode_prefix",
            "barcode_next_number",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class InventorySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventorySettings
        fields = (
            "default_reorder_percent",
            "transfer_requires_approval",
            "pos_force_return_from_invoice",
            "pos_require_seller_on_scan",
            "pos_commission_basis",
            "pos_allow_multiple_sellers",
            "updated_at",
        )


class ProductVariantSerializer(serializers.ModelSerializer):
    size_code = serializers.CharField(source="size.code", read_only=True)
    color_code = serializers.CharField(source="color.code", read_only=True)
    size_name = serializers.CharField(source="size.name_ar", read_only=True)
    color_name = serializers.CharField(source="color.name_ar", read_only=True)

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "size",
            "color",
            "size_code",
            "color_code",
            "size_name",
            "color_name",
            "barcode",
            "purchase_price",
            "sale_price",
            "offer_price",
            "is_active",
        )


class ProductSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name_ar", read_only=True)
    section_name = serializers.CharField(source="section.name_ar", read_only=True)
    classification_name = serializers.CharField(
        source="classification.name_ar", read_only=True
    )
    supplier_name = serializers.CharField(source="supplier.name_ar", read_only=True)
    season_name = serializers.CharField(source="season.name_ar", read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "code",
            "barcode",
            "name_ar",
            "name_en",
            "description",
            "brand",
            "section",
            "classification",
            "supplier",
            "season",
            "brand_name",
            "section_name",
            "classification_name",
            "supplier_name",
            "season_name",
            "purchase_price",
            "markup_percent",
            "sale_price",
            "offer_price",
            "reorder_percent",
            "is_active",
            "variants",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "code", "sale_price", "created_at", "updated_at")


class ProductWriteSerializer(serializers.Serializer):
    code = serializers.CharField(required=False, allow_blank=True, max_length=30)
    barcode = serializers.CharField(required=False, allow_blank=True, max_length=64)
    name_ar = serializers.CharField(max_length=300)
    name_en = serializers.CharField(required=False, allow_blank=True, max_length=300)
    description = serializers.CharField(required=False, allow_blank=True)
    brand = serializers.UUIDField(required=False, allow_null=True)
    section = serializers.UUIDField(required=False, allow_null=True)
    classification = serializers.UUIDField(required=False, allow_null=True)
    supplier = serializers.UUIDField(required=False, allow_null=True)
    season = serializers.UUIDField(required=False, allow_null=True)
    purchase_price = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    markup_percent = serializers.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0"))
    sale_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    offer_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    reorder_percent = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True
    )
    size_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )
    color_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )


class ProductVariantWriteSerializer(serializers.Serializer):
    size_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)
    color_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)


class StockTransferLineSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="variant.product.code", read_only=True)
    product_name = serializers.CharField(source="variant.product.name_ar", read_only=True)
    size_name = serializers.CharField(source="variant.size.name_ar", read_only=True)
    color_name = serializers.CharField(source="variant.color.name_ar", read_only=True)

    class Meta:
        model = StockTransferLine
        fields = ("id", "variant", "quantity", "product_code", "product_name", "size_name", "color_name")


class StockTransferSerializer(serializers.ModelSerializer):
    from_warehouse_name = serializers.CharField(source="from_warehouse.name_ar", read_only=True)
    to_warehouse_name = serializers.CharField(source="to_warehouse.name_ar", read_only=True)
    from_branch_name = serializers.CharField(source="from_branch.name_ar", read_only=True)
    to_branch_name = serializers.CharField(source="to_branch.name_ar", read_only=True)
    lines = StockTransferLineSerializer(many=True, read_only=True)

    class Meta:
        model = StockTransfer
        fields = (
            "id",
            "code",
            "transfer_type",
            "from_warehouse",
            "to_warehouse",
            "from_branch",
            "to_branch",
            "from_warehouse_name",
            "to_warehouse_name",
            "from_branch_name",
            "to_branch_name",
            "status",
            "requires_approval",
            "notes",
            "lines",
            "created_at",
            "approved_at",
        )


class StockTransferWriteSerializer(serializers.Serializer):
    transfer_type = serializers.ChoiceField(
        choices=StockTransfer.TransferType.choices,
        default=StockTransfer.TransferType.WAREHOUSE_WAREHOUSE,
    )
    from_warehouse = serializers.UUIDField(required=False, allow_null=True)
    to_warehouse = serializers.UUIDField(required=False, allow_null=True)
    from_branch = serializers.UUIDField(required=False, allow_null=True)
    to_branch = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    requires_approval = serializers.BooleanField(required=False, allow_null=True)
    lines = serializers.ListField(child=serializers.DictField(), min_length=1)


class StockScrapLineSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="variant.product.code", read_only=True)
    product_name = serializers.CharField(source="variant.product.name_ar", read_only=True)
    size_name = serializers.CharField(source="variant.size.name_ar", read_only=True)
    color_name = serializers.CharField(source="variant.color.name_ar", read_only=True)

    class Meta:
        model = StockScrapLine
        fields = ("id", "variant", "quantity", "product_code", "product_name", "size_name", "color_name")


class StockScrapSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source="warehouse.name_ar", read_only=True)
    lines = StockScrapLineSerializer(many=True, read_only=True)

    class Meta:
        model = StockScrap
        fields = (
            "id",
            "code",
            "warehouse",
            "warehouse_name",
            "reason",
            "status",
            "lines",
            "created_at",
        )


class StockScrapWriteSerializer(serializers.Serializer):
    warehouse = serializers.UUIDField()
    reason = serializers.CharField()
    lines = serializers.ListField(child=serializers.DictField(), min_length=1)


class StockDisbursementLineSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="variant.product.code", read_only=True)
    product_name = serializers.CharField(source="variant.product.name_ar", read_only=True)
    size_name = serializers.CharField(source="variant.size.name_ar", read_only=True)
    color_name = serializers.CharField(source="variant.color.name_ar", read_only=True)

    class Meta:
        model = StockDisbursementLine
        fields = ("id", "variant", "quantity", "product_code", "product_name", "size_name", "color_name")


class StockDisbursementSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source="warehouse.name_ar", read_only=True)
    purpose_label = serializers.CharField(source="get_purpose_display", read_only=True)
    lines = StockDisbursementLineSerializer(many=True, read_only=True)

    class Meta:
        model = StockDisbursement
        fields = (
            "id",
            "code",
            "warehouse",
            "warehouse_name",
            "purpose",
            "purpose_label",
            "notes",
            "status",
            "lines",
            "created_at",
            "approved_at",
        )


class StockDisbursementWriteSerializer(serializers.Serializer):
    warehouse = serializers.UUIDField()
    purpose = serializers.ChoiceField(choices=StockDisbursement.Purpose.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
    lines = serializers.ListField(child=serializers.DictField(), min_length=1)


class StockAdditionLineSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="variant.product.code", read_only=True)
    product_name = serializers.CharField(source="variant.product.name_ar", read_only=True)
    size_name = serializers.CharField(source="variant.size.name_ar", read_only=True)
    color_name = serializers.CharField(source="variant.color.name_ar", read_only=True)

    class Meta:
        model = StockAdditionLine
        fields = ("id", "variant", "quantity", "product_code", "product_name", "size_name", "color_name")


class StockAdditionSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source="warehouse.name_ar", read_only=True)
    purpose_label = serializers.CharField(source="get_purpose_display", read_only=True)
    lines = StockAdditionLineSerializer(many=True, read_only=True)

    class Meta:
        model = StockAddition
        fields = (
            "id",
            "code",
            "warehouse",
            "warehouse_name",
            "purpose",
            "purpose_label",
            "notes",
            "status",
            "lines",
            "created_at",
            "approved_at",
        )


class StockAdditionWriteSerializer(serializers.Serializer):
    warehouse = serializers.UUIDField()
    purpose = serializers.ChoiceField(choices=StockAddition.Purpose.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
    lines = serializers.ListField(child=serializers.DictField(), min_length=1)


class StockBalanceSerializer(serializers.ModelSerializer):
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name_ar", read_only=True)
    product_code = serializers.CharField(source="variant.product.code", read_only=True)
    product_name = serializers.CharField(source="variant.product.name_ar", read_only=True)
    size_name = serializers.CharField(source="variant.size.name_ar", read_only=True)
    color_name = serializers.CharField(source="variant.color.name_ar", read_only=True)
    purchase_price = serializers.DecimalField(
        source="variant.product.purchase_price", max_digits=12, decimal_places=2, read_only=True
    )
    sale_price = serializers.DecimalField(
        source="variant.product.sale_price", max_digits=12, decimal_places=2, read_only=True
    )
    offer_price = serializers.DecimalField(
        source="variant.product.offer_price", max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = StockBalance
        fields = (
            "id",
            "warehouse",
            "warehouse_code",
            "warehouse_name",
            "variant",
            "product_code",
            "product_name",
            "size_name",
            "color_name",
            "quantity",
            "purchase_price",
            "sale_price",
            "offer_price",
        )


class StockCountLineSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="variant.product.code", read_only=True)
    product_name = serializers.CharField(source="variant.product.name_ar", read_only=True)
    section_name = serializers.CharField(source="variant.product.section.name_ar", read_only=True)
    size_name = serializers.CharField(source="variant.size.name_ar", read_only=True)
    color_name = serializers.CharField(source="variant.color.name_ar", read_only=True)
    sale_price = serializers.SerializerMethodField()
    variance = serializers.SerializerMethodField()
    variance_value = serializers.SerializerMethodField()
    count_value = serializers.SerializerMethodField()

    class Meta:
        model = StockCountLine
        fields = (
            "id",
            "variant",
            "product_code",
            "product_name",
            "section_name",
            "size_name",
            "color_name",
            "sale_price",
            "system_qty",
            "counted_qty",
            "variance",
            "variance_value",
            "count_value",
        )

    def get_sale_price(self, obj):
        return _variant_unit_price(obj.variant, "sale_price")

    def get_variance(self, obj):
        return (obj.counted_qty - obj.system_qty).quantize(Decimal("0.001"))

    def get_variance_value(self, obj):
        price = _variant_unit_price(obj.variant, "sale_price")
        var = obj.counted_qty - obj.system_qty
        return (var * price).quantize(Decimal("0.01"))

    def get_count_value(self, obj):
        price = _variant_unit_price(obj.variant, "sale_price")
        return (obj.counted_qty * price).quantize(Decimal("0.01"))


class StockCountSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source="warehouse.name_ar", read_only=True)
    branch_name = serializers.CharField(source="branch.name_ar", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name_ar", read_only=True)
    supplier_group_name = serializers.CharField(source="supplier_group.name_ar", read_only=True)
    section_name = serializers.CharField(source="section.name_ar", read_only=True)
    brand_name = serializers.CharField(source="brand.name_ar", read_only=True)
    classification_name = serializers.CharField(source="classification.name_ar", read_only=True)
    product_name_filter = serializers.CharField(source="product.name_ar", read_only=True)
    scan_order_code = serializers.CharField(source="scan_order.code", read_only=True)
    addition_code = serializers.CharField(source="addition_voucher.code", read_only=True)
    disbursement_code = serializers.CharField(source="disbursement_voucher.code", read_only=True)
    count_mode_label = serializers.SerializerMethodField()
    lines = StockCountLineSerializer(many=True, read_only=True)
    line_count = serializers.SerializerMethodField()
    total_variance_value = serializers.SerializerMethodField()

    class Meta:
        model = StockCount
        fields = (
            "id",
            "code",
            "branch",
            "branch_name",
            "warehouse",
            "warehouse_name",
            "count_mode",
            "count_mode_label",
            "scan_order",
            "scan_order_code",
            "supplier",
            "supplier_name",
            "supplier_group",
            "supplier_group_name",
            "section",
            "section_name",
            "brand",
            "brand_name",
            "classification",
            "classification_name",
            "product",
            "product_name_filter",
            "notes",
            "status",
            "addition_voucher",
            "addition_code",
            "disbursement_voucher",
            "disbursement_code",
            "lines",
            "line_count",
            "total_variance_value",
            "created_at",
            "approved_at",
        )

    def get_count_mode_label(self, obj):
        return dict(StockCount.CountMode.choices).get(obj.count_mode, obj.count_mode)

    def get_line_count(self, obj):
        return obj.lines.count()

    def get_total_variance_value(self, obj):
        total = Decimal("0")
        for ln in obj.lines.all():
            price = _variant_unit_price(ln.variant, "sale_price")
            total += (ln.counted_qty - ln.system_qty) * price
        return total.quantize(Decimal("0.01"))


class StockCountWriteSerializer(serializers.Serializer):
    branch = serializers.UUIDField(required=False, allow_null=True)
    warehouse = serializers.UUIDField()
    count_mode = serializers.ChoiceField(
        choices=StockCount.CountMode.choices,
        required=False,
        default=StockCount.CountMode.FILTER,
    )
    scan_order = serializers.UUIDField(required=False, allow_null=True)
    supplier = serializers.UUIDField(required=False, allow_null=True)
    supplier_group = serializers.UUIDField(required=False, allow_null=True)
    section = serializers.UUIDField(required=False, allow_null=True)
    brand = serializers.UUIDField(required=False, allow_null=True)
    classification = serializers.UUIDField(required=False, allow_null=True)
    product = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    lines = serializers.ListField(child=serializers.DictField(), required=False)


class CompositeLineSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="variant.product.code", read_only=True)
    product_name = serializers.CharField(source="variant.product.name_ar", read_only=True)
    size_name = serializers.CharField(source="variant.size.name_ar", read_only=True)
    color_name = serializers.CharField(source="variant.color.name_ar", read_only=True)

    class Meta:
        model = CompositeProductLine
        fields = (
            "id",
            "variant",
            "quantity",
            "product_code",
            "product_name",
            "size_name",
            "color_name",
        )


class CompositeProductSerializer(serializers.ModelSerializer):
    lines = CompositeLineSerializer(many=True, read_only=True)

    class Meta:
        model = CompositeProduct
        fields = (
            "id",
            "code",
            "barcode",
            "name_ar",
            "name_en",
            "sale_price",
            "offer_price",
            "is_active",
            "lines",
            "created_at",
            "updated_at",
        )


class CompositeWriteSerializer(serializers.Serializer):
    code = serializers.CharField(required=False, allow_blank=True, max_length=30)
    barcode = serializers.CharField(required=False, allow_blank=True)
    name_ar = serializers.CharField(max_length=300)
    name_en = serializers.CharField(required=False, allow_blank=True)
    sale_price = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    offer_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    is_active = serializers.BooleanField(required=False, default=True)
    lines = serializers.ListField(child=serializers.DictField(), min_length=1)


class PriceAdjustmentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name_ar", read_only=True)
    season_name = serializers.CharField(source="season.name_ar", read_only=True)

    class Meta:
        model = PriceAdjustment
        fields = (
            "id",
            "code",
            "scope",
            "target",
            "mode",
            "direction",
            "value",
            "supplier",
            "supplier_name",
            "season",
            "season_name",
            "brand",
            "section",
            "offer_starts_at",
            "offer_ends_at",
            "products_affected",
            "supplier_account_amount",
            "created_at",
        )


class PriceAdjustmentWriteSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(choices=PriceAdjustment.Scope.choices)
    target = serializers.ChoiceField(
        choices=PriceAdjustment.Target.choices,
        required=False,
        allow_null=True,
    )
    mode = serializers.ChoiceField(choices=PriceAdjustment.Mode.choices)
    direction = serializers.ChoiceField(choices=PriceAdjustment.Direction.choices)
    value = serializers.DecimalField(max_digits=12, decimal_places=2)
    supplier = serializers.UUIDField(required=False, allow_null=True)
    season = serializers.UUIDField(required=False, allow_null=True)
    brand = serializers.UUIDField(required=False, allow_null=True)
    section = serializers.UUIDField(required=False, allow_null=True)
    classification = serializers.UUIDField(required=False, allow_null=True)
    supplier_group = serializers.UUIDField(required=False, allow_null=True)
    offer_starts_at = serializers.DateField(required=False, allow_null=True)
    offer_ends_at = serializers.DateField(required=False, allow_null=True)
    q = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        scope = attrs.get("scope", PriceAdjustment.Scope.CARD)
        if scope == PriceAdjustment.Scope.SUPPLIER:
            attrs["target"] = PriceAdjustment.Target.PURCHASE
            if not attrs.get("supplier"):
                raise serializers.ValidationError(
                    {"supplier": "المورد مطلوب لتعديل أسعار المورد."}
                )
        else:
            attrs["target"] = PriceAdjustment.Target.SALE
        return attrs
