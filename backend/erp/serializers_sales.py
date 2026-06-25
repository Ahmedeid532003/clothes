from decimal import Decimal

from rest_framework import serializers

from erp.sale_models import (
    CustomerReservation,
    CustomerReservationLine,
    SaleReturn,
    SaleReturnLine,
    SalesQuotation,
    SalesQuotationLine,
)
from erp.serializers_pos import SaleSerializer


class SalesInvoiceSerializer(SaleSerializer):
    """نفس فاتورة البيع المستخدمة في POS مع حقول الضريبة والمدفوعات."""


class SaleReturnLineSerializer(serializers.ModelSerializer):
    product_code = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    size_name = serializers.SerializerMethodField()
    color_name = serializers.SerializerMethodField()

    class Meta:
        model = SaleReturnLine
        fields = (
            "id",
            "sale_line",
            "variant",
            "composite_product",
            "product_code",
            "product_name",
            "size_name",
            "color_name",
            "quantity",
            "unit_price",
            "discount_percent",
            "line_total",
        )

    def get_product_code(self, obj) -> str:
        if obj.composite_product_id:
            return obj.composite_product.code
        return obj.variant.product.code if obj.variant_id else ""

    def get_product_name(self, obj) -> str:
        if obj.composite_product_id:
            return obj.composite_product.name_ar
        return obj.variant.product.name_ar if obj.variant_id else ""

    def get_size_name(self, obj) -> str:
        return "" if obj.composite_product_id else (obj.variant.size.name_ar if obj.variant_id else "")

    def get_color_name(self, obj) -> str:
        return "" if obj.composite_product_id else (obj.variant.color.name_ar if obj.variant_id else "")


class SaleReturnSerializer(serializers.ModelSerializer):
    sale_code = serializers.CharField(source="sale.code", read_only=True)
    branch_name = serializers.CharField(source="branch.name_ar", read_only=True)
    customer_name = serializers.CharField(source="customer.name_ar", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    lines = SaleReturnLineSerializer(many=True, read_only=True)

    class Meta:
        model = SaleReturn
        fields = (
            "id",
            "code",
            "sale",
            "sale_code",
            "branch",
            "branch_name",
            "warehouse",
            "customer",
            "customer_name",
            "status",
            "refund_method",
            "subtotal",
            "tax_amount",
            "total",
            "down_payment_refund",
            "return_interest",
            "reason",
            "notes",
            "lines",
            "created_by_name",
            "created_at",
        )


class SaleReturnLineWriteSerializer(serializers.Serializer):
    sale_line = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))


class SaleReturnWriteSerializer(serializers.Serializer):
    refund_method = serializers.ChoiceField(
        choices=SaleReturn.RefundMethod.choices,
        default=SaleReturn.RefundMethod.CASH,
    )
    reason = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    down_payment_refund = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=Decimal("0")
    )
    return_interest = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=Decimal("0")
    )
    lines = SaleReturnLineWriteSerializer(many=True, min_length=1)


class DraftSalesLineSerializer(serializers.ModelSerializer):
    product_code = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    size_name = serializers.SerializerMethodField()
    color_name = serializers.SerializerMethodField()
    composite = serializers.UUIDField(source="composite_product_id", read_only=True)

    class Meta:
        fields = (
            "id",
            "variant",
            "composite",
            "product_code",
            "product_name",
            "size_name",
            "color_name",
            "quantity",
            "unit_price",
            "discount_percent",
            "line_total",
        )

    def get_product_code(self, obj) -> str:
        if obj.composite_product_id:
            return obj.composite_product.code
        return obj.variant.product.code if obj.variant_id else ""

    def get_product_name(self, obj) -> str:
        if obj.composite_product_id:
            return obj.composite_product.name_ar
        return obj.variant.product.name_ar if obj.variant_id else ""

    def get_size_name(self, obj) -> str:
        return "" if obj.composite_product_id else (obj.variant.size.name_ar if obj.variant_id else "")

    def get_color_name(self, obj) -> str:
        return "" if obj.composite_product_id else (obj.variant.color.name_ar if obj.variant_id else "")


class QuotationLineSerializer(DraftSalesLineSerializer):
    class Meta(DraftSalesLineSerializer.Meta):
        model = SalesQuotationLine


class ReservationLineSerializer(DraftSalesLineSerializer):
    class Meta(DraftSalesLineSerializer.Meta):
        model = CustomerReservationLine


class SalesQuotationSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name_ar", read_only=True)
    customer_name = serializers.CharField(source="customer.name_ar", read_only=True)
    converted_sale_code = serializers.CharField(source="converted_sale.code", read_only=True)
    lines = QuotationLineSerializer(many=True, read_only=True)

    class Meta:
        model = SalesQuotation
        fields = (
            "id",
            "code",
            "branch",
            "branch_name",
            "warehouse",
            "customer",
            "customer_name",
            "status",
            "subtotal",
            "discount_amount",
            "tax_percent",
            "tax_amount",
            "total",
            "valid_until",
            "notes",
            "converted_sale",
            "converted_sale_code",
            "lines",
            "created_at",
        )


class CustomerReservationSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name_ar", read_only=True)
    customer_name = serializers.SerializerMethodField()
    converted_sale_code = serializers.CharField(source="converted_sale.code", read_only=True)
    lines = ReservationLineSerializer(many=True, read_only=True)

    def get_customer_name(self, obj):
        if obj.customer_id:
            return obj.customer.name_ar
        return ""

    class Meta:
        model = CustomerReservation
        fields = (
            "id",
            "code",
            "branch",
            "branch_name",
            "warehouse",
            "customer",
            "customer_name",
            "status",
            "subtotal",
            "discount_amount",
            "total",
            "deposit_amount",
            "deposit_method",
            "notes",
            "converted_sale",
            "converted_sale_code",
            "lines",
            "created_at",
        )


class DraftLineWriteSerializer(serializers.Serializer):
    variant = serializers.UUIDField(required=False, allow_null=True)
    composite = serializers.UUIDField(required=False, allow_null=True)
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))
    discount_percent = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, default=Decimal("0")
    )


class SalesQuotationWriteSerializer(serializers.Serializer):
    customer = serializers.UUIDField(required=False, allow_null=True)
    discount_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=Decimal("0")
    )
    tax_percent = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, default=Decimal("0")
    )
    valid_until = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    lines = DraftLineWriteSerializer(many=True, min_length=1)


class CustomerReservationWriteSerializer(serializers.Serializer):
    customer = serializers.UUIDField(required=False, allow_null=True)
    discount_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=Decimal("0")
    )
    deposit_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=Decimal("0")
    )
    deposit_method = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    lines = DraftLineWriteSerializer(many=True, min_length=1)

