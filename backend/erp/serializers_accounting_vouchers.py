from rest_framework import serializers

from erp.accounting_models import GeneralExpenseVoucher


class ExpenseVoucherWriteSerializer(serializers.Serializer):
    voucher_date = serializers.DateField()
    expense_type = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    tax_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=0
    )
    payment_method = serializers.ChoiceField(
        choices=GeneralExpenseVoucher.PaymentMethod.choices,
        required=False,
    )
    treasury = serializers.UUIDField()
    branch = serializers.UUIDField(required=False, allow_null=True)
    cost_center = serializers.UUIDField(required=False, allow_null=True)
    beneficiary = serializers.CharField(required=False, allow_blank=True)
    supplier = serializers.UUIDField(required=False, allow_null=True)
    responsible = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class CashShiftOpenSerializer(serializers.Serializer):
    branch = serializers.UUIDField()
    treasury = serializers.UUIDField()
    opening_balance = serializers.DecimalField(max_digits=14, decimal_places=2, default=0)


class CashShiftCloseSerializer(serializers.Serializer):
    actual_balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True)


class CashShiftReceiveSerializer(serializers.Serializer):
    target_treasury = serializers.UUIDField(required=False, allow_null=True)
