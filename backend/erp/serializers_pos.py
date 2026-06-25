from decimal import Decimal

from rest_framework import serializers

from erp.sale_models import Sale, SaleLine, SalePayment, SaleReturn
from tenancy.context import get_current_tenant


class SaleLineSerializer(serializers.ModelSerializer):
    product_code = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    size_name = serializers.SerializerMethodField()
    color_name = serializers.SerializerMethodField()
    composite_product = serializers.UUIDField(source="composite_product_id", read_only=True)
    is_composite = serializers.SerializerMethodField()
    seller_name = serializers.CharField(source="seller.full_name", read_only=True, default="")

    class Meta:
        model = SaleLine
        fields = (
            "id",
            "variant",
            "composite_product",
            "is_composite",
            "product_code",
            "product_name",
            "size_name",
            "color_name",
            "quantity",
            "unit_price",
            "discount_percent",
            "line_total",
            "seller",
            "seller_name",
            "line_commission",
        )

    def get_is_composite(self, obj) -> bool:
        return obj.composite_product_id is not None

    def get_product_code(self, obj) -> str:
        if obj.composite_product_id:
            return obj.composite_product.code
        return obj.variant.product.code if obj.variant_id else ""

    def get_product_name(self, obj) -> str:
        if obj.composite_product_id:
            return obj.composite_product.name_ar
        return obj.variant.product.name_ar if obj.variant_id else ""

    def get_size_name(self, obj) -> str:
        if obj.composite_product_id:
            return ""
        return obj.variant.size.name_ar if obj.variant_id else ""

    def get_color_name(self, obj) -> str:
        if obj.composite_product_id:
            return ""
        return obj.variant.color.name_ar if obj.variant_id else ""


class SaleSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name_ar", read_only=True)
    branch_code = serializers.CharField(source="branch.code", read_only=True)
    branch_address = serializers.CharField(source="branch.address", read_only=True)
    company_name = serializers.SerializerMethodField()
    company_phone = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source="customer.name_ar", read_only=True)
    customer_tax_registration_number = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    delivery_agent_name = serializers.CharField(source="delivery_agent.full_name", read_only=True, default="")
    delivery_fee_effective = serializers.SerializerMethodField()
    lines = SaleLineSerializer(many=True, read_only=True)
    payments = serializers.SerializerMethodField()
    installment_receipt = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = (
            "id",
            "code",
            "branch",
            "branch_name",
            "branch_code",
            "branch_address",
            "company_name",
            "company_phone",
            "warehouse",
            "season",
            "status",
            "payment_method",
            "customer",
            "customer_name",
            "customer_tax_registration_number",
            "subtotal",
            "discount_amount",
            "tax_percent",
            "tax_amount",
            "total",
            "commission_amount",
            "cashier_points",
            "is_tax_invoice",
            "tax_registration_number",
            "qr_payload",
            "notes",
            "is_delivery",
            "delivery_fee",
            "delivery_fee_effective",
            "delivery_agent",
            "delivery_agent_name",
            "delivery_status",
            "customer_phone",
            "lines",
            "payments",
            "installment_receipt",
            "created_by_name",
            "created_at",
        )

    def get_company_name(self, obj) -> str:
        tenant = get_current_tenant()
        return tenant.name if tenant else ""

    def get_company_phone(self, obj) -> str:
        tenant = get_current_tenant()
        return tenant.contact_phone if tenant else ""

    def get_customer_tax_registration_number(self, obj) -> str:
        if not obj.customer_id:
            return ""
        return (obj.customer.profile_data or {}).get("tax_registration_number", "")

    def get_customer_phone(self, obj) -> str:
        if not obj.customer_id:
            return ""
        return obj.customer.phone or ""

    def get_delivery_fee_effective(self, obj) -> str:
        from erp.services.pos import effective_delivery_fee

        return str(effective_delivery_fee(obj).quantize(Decimal("0.01")))

    def get_payments(self, obj):
        return [
            {
                "id": str(p.id),
                "payment_method": p.payment_method,
                "amount": str(p.amount),
                "reference": p.reference,
            }
            for p in obj.payments.all()
        ]

    def get_installment_receipt(self, obj):
        receipt = getattr(obj, "_installment_receipt", None)
        if receipt:
            return receipt
        from erp.receivable_models import InstallmentContract
        from erp.services.receivables import build_installment_receipt

        contract = (
            InstallmentContract.objects.using("tenant")
            .select_related("customer", "plan")
            .prefetch_related("lines")
            .filter(sale_id=obj.pk)
            .first()
        )
        if not contract:
            return None
        prev = (contract.customer.balance_due or Decimal("0")) - (
            contract.financed_amount + contract.interest_amount
        )
        return build_installment_receipt(
            sale=obj,
            contract=contract,
            customer=contract.customer,
            previous_balance=max(prev, Decimal("0")),
            down_payment_collected=contract.down_payment_amount,
        )


class SalePaymentWriteSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=Sale.PaymentMethod.choices)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    reference = serializers.CharField(required=False, allow_blank=True)


class SaleLineWriteSerializer(serializers.Serializer):
    variant = serializers.UUIDField(required=False, allow_null=True)
    composite = serializers.UUIDField(required=False, allow_null=True)
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, min_value=Decimal("0")
    )
    discount_percent = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, default=Decimal("0")
    )
    seller = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        variant = attrs.get("variant")
        composite = attrs.get("composite")
        if bool(variant) == bool(composite):
            raise serializers.ValidationError(
                "حدد صنفًا (variant) أو عرضًا مركبًا (composite) — وليس الاثنين معًا."
            )
        return attrs


class SaleWriteSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(
        choices=Sale.PaymentMethod.choices,
        default=Sale.PaymentMethod.CASH,
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    discount_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=Decimal("0")
    )
    tax_percent = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, default=Decimal("0")
    )
    is_tax_invoice = serializers.BooleanField(required=False, default=False)
    tax_registration_number = serializers.CharField(required=False, allow_blank=True)
    customer = serializers.UUIDField(required=False, allow_null=True)
    installment_plan = serializers.UUIDField(required=False, allow_null=True)
    down_payment_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )
    num_installments = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    is_delivery = serializers.BooleanField(required=False, default=False)
    delivery_fee = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=Decimal("0")
    )
    delivery_agent = serializers.UUIDField(required=False, allow_null=True)
    card_merchant_account = serializers.UUIDField(required=False, allow_null=True)
    card_transaction_number = serializers.CharField(required=False, allow_blank=True)
    e_wallet_account = serializers.UUIDField(required=False, allow_null=True)
    payments = SalePaymentWriteSerializer(many=True, required=False)
    lines = SaleLineWriteSerializer(many=True, min_length=1)


class DeliveryOrderUpdateSerializer(serializers.Serializer):
    delivery_agent = serializers.UUIDField(required=False, allow_null=True)
    delivery_status = serializers.ChoiceField(
        choices=Sale.DeliveryStatus.choices,
        required=False,
        allow_blank=True,
    )


class PosExchangeReturnLineSerializer(serializers.Serializer):
    sale = serializers.UUIDField()
    sale_line = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))


class PosExchangeWriteSerializer(serializers.Serializer):
    customer = serializers.UUIDField(required=False, allow_null=True)
    refund_method = serializers.ChoiceField(
        choices=SaleReturn.RefundMethod.choices,
        required=False,
        default=SaleReturn.RefundMethod.CASH,
    )
    payment_method = serializers.ChoiceField(choices=Sale.PaymentMethod.choices, required=False)
    difference_payment_method = serializers.CharField(required=False, allow_blank=True, default="cash")
    discount_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=Decimal("0")
    )
    reason = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    return_lines = PosExchangeReturnLineSerializer(many=True, required=False, default=list)
    new_lines = SaleLineWriteSerializer(many=True, required=False, default=list)
    payments = SalePaymentWriteSerializer(many=True, required=False)
