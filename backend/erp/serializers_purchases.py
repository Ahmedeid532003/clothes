from decimal import Decimal

from rest_framework import serializers

from erp.purchase_models import PurchaseInvoice, PurchaseInvoiceLine
from erp.serializer_fields import DefaultTodayDateField


class PurchaseInvoiceLineSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="variant.product.code", read_only=True)
    product_name = serializers.CharField(source="variant.product.name_ar", read_only=True)
    size_name = serializers.CharField(source="variant.size.name_ar", read_only=True)
    color_name = serializers.CharField(source="variant.color.name_ar", read_only=True)

    class Meta:
        model = PurchaseInvoiceLine
        fields = (
            "id",
            "variant",
            "product_code",
            "product_name",
            "size_name",
            "color_name",
            "quantity",
            "unit_cost",
            "discount_percent",
            "tax_percent",
            "line_total",
        )


class PurchaseInvoiceSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name_ar", read_only=True)
    season_name = serializers.CharField(source="season.name_ar", read_only=True)
    brand_name = serializers.SerializerMethodField()
    warehouse_name = serializers.CharField(source="warehouse.name_ar", read_only=True)
    branch_name = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )
    lines = PurchaseInvoiceLineSerializer(many=True, read_only=True)
    source_invoice_code = serializers.CharField(
        source="source_invoice.code", read_only=True, allow_null=True
    )
    return_reason_label = serializers.SerializerMethodField()

    def get_return_reason_label(self, obj):
        if not obj.return_reason:
            return ""
        return dict(PurchaseInvoice.ReturnReason.choices).get(
            obj.return_reason, obj.return_reason
        )

    def get_brand_name(self, obj):
        return obj.brand.name_ar if obj.brand_id else ""

    def get_branch_name(self, obj):
        return obj.branch.name_ar if obj.branch_id else ""

    class Meta:
        model = PurchaseInvoice
        fields = (
            "id",
            "code",
            "invoice_type",
            "supplier",
            "supplier_name",
            "season",
            "season_name",
            "brand",
            "brand_name",
            "warehouse",
            "warehouse_name",
            "branch",
            "branch_name",
            "status",
            "invoice_date",
            "notes",
            "subtotal",
            "discount_amount",
            "tax_amount",
            "total",
            "payment_method",
            "return_reason",
            "return_reason_label",
            "source_invoice",
            "source_invoice_code",
            "lines",
            "created_by_name",
            "received_at",
            "created_at",
        )


class PurchaseInvoiceLineWriteSerializer(serializers.Serializer):
    variant = serializers.UUIDField(required=False)
    product = serializers.UUIDField(required=False)
    size = serializers.UUIDField(required=False)
    color = serializers.UUIDField(required=False)
    quantity = serializers.DecimalField(
        max_digits=14,
        decimal_places=3,
        min_value=Decimal("0.001"),
        error_messages={
            "invalid": "أدخل كمية رقمية صحيحة.",
            "min_value": "الكمية يجب أن تكون أكبر من صفر.",
            "required": "الكمية مطلوبة.",
        },
    )
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))
    discount_percent = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, default=Decimal("0")
    )
    tax_percent = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, default=Decimal("0")
    )

    def validate(self, attrs):
        if not attrs.get("variant") and not (
            attrs.get("product") and attrs.get("size") and attrs.get("color")
        ):
            raise serializers.ValidationError(
                "حدد variant أو product+size+color لكل بند."
            )
        return attrs


class QuickCreateProductSerializer(serializers.Serializer):
    name_ar = serializers.CharField(max_length=300)
    name_en = serializers.CharField(required=False, allow_blank=True, max_length=300)
    barcode = serializers.CharField(required=False, allow_blank=True, max_length=64)
    supplier = serializers.UUIDField()
    season = serializers.UUIDField()
    brand = serializers.UUIDField(required=False, allow_null=True)
    purchase_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        default=Decimal("0"),
    )
    markup_percent = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        required=False,
        allow_null=True,
        default=Decimal("0"),
    )
    size_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)
    color_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)

    def validate_purchase_price(self, value):
        if value in (None, ""):
            return Decimal("0")
        return value

    def validate_markup_percent(self, value):
        if value in (None, ""):
            return Decimal("0")
        return value


class PurchaseInvoiceWriteSerializer(serializers.Serializer):
    supplier = serializers.UUIDField()
    season = serializers.UUIDField()
    brand = serializers.UUIDField(required=False, allow_null=True)
    warehouse = serializers.UUIDField()
    branch = serializers.UUIDField(required=False, allow_null=True)
    invoice_date = DefaultTodayDateField()
    notes = serializers.CharField(required=False, allow_blank=True)
    discount_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=Decimal("0")
    )
    payment_method = serializers.ChoiceField(
        choices=["cash", "credit"], required=False, default="credit"
    )
    source_invoice = serializers.UUIDField(required=False, allow_null=True)
    return_reason = serializers.ChoiceField(
        choices=[c[0] for c in PurchaseInvoice.ReturnReason.choices],
        required=False,
        allow_blank=True,
    )
    lines = PurchaseInvoiceLineWriteSerializer(many=True, min_length=1)
