from rest_framework import serializers

from erp.accounting_models import TreasuryMovement


class ShiftHandoverCreateSerializer(serializers.Serializer):
    from_shift = serializers.UUIDField()
    to_employee = serializers.UUIDField()
    difference_reason = serializers.CharField(required=False, allow_blank=True)


class ShiftHandoverReceiveSerializer(serializers.Serializer):
    received_balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    difference_reason = serializers.CharField(required=False, allow_blank=True)


class TreasuryMovementWriteSerializer(serializers.Serializer):
    movement_date = serializers.DateField()
    movement_type = serializers.ChoiceField(choices=TreasuryMovement.MovementType.choices)
    treasury = serializers.UUIDField()
    counter_treasury = serializers.UUIDField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency = serializers.CharField(required=False, default="EGP", max_length=3)
    branch = serializers.UUIDField(required=False, allow_null=True)
    cash_shift = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
