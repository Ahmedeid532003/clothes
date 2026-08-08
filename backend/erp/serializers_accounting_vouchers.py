from rest_framework import serializers

from erp.accounting_models import GeneralExpenseVoucher
from erp.serializer_fields import DefaultTodayDateField


class ExpenseVoucherWriteSerializer(serializers.Serializer):
    voucher_date = DefaultTodayDateField()
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

    def validate_actual_balance(self, value):
        if value is None:
            raise serializers.ValidationError("المبلغ الفعلي مطلوب.")
        if value < 0:
            raise serializers.ValidationError("المبلغ الفعلي لا يمكن أن يكون سالباً.")
        return value

    def to_internal_value(self, data):
        payload = dict(data)
        raw = payload.get("actual_balance")
        if isinstance(raw, str):
            payload["actual_balance"] = raw.replace(",", "").strip()
        return super().to_internal_value(payload)


class CashShiftReceiveSerializer(serializers.Serializer):
    target_treasury = serializers.UUIDField(required=False, allow_null=True)
