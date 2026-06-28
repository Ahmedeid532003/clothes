from rest_framework import serializers

from erp.accounting_models import FixedAsset, GlAccount
from erp.serializer_fields import DefaultTodayDateField


class ChartAccountWriteSerializer(serializers.Serializer):
    name_ar = serializers.CharField()
    name_en = serializers.CharField(required=False, allow_blank=True)
    parent = serializers.UUIDField(required=False, allow_null=True)
    account_type = serializers.ChoiceField(choices=GlAccount.AccountType.choices, required=False)
    code = serializers.CharField(required=False, allow_blank=True, max_length=30)
    code_segment = serializers.CharField(required=False, allow_blank=True, max_length=12)
    cost_center = serializers.UUIDField(required=False, allow_null=True)
    branch = serializers.UUIDField(required=False, allow_null=True)


class CurrencyWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=3)
    name_ar = serializers.CharField()
    name_en = serializers.CharField(required=False, allow_blank=True)
    symbol = serializers.CharField(required=False, allow_blank=True, max_length=8)
    rate_to_base = serializers.DecimalField(max_digits=14, decimal_places=6)
    is_base = serializers.BooleanField(required=False, default=False)


class CurrencyConvertSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency = serializers.CharField(max_length=3)


class FixedAssetWriteSerializer(serializers.Serializer):
    name_ar = serializers.CharField()
    name_en = serializers.CharField(required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=FixedAsset.Category.choices, required=False)
    acquisition_date = DefaultTodayDateField()
    cost = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency = serializers.UUIDField(required=False, allow_null=True)
    useful_life_months = serializers.IntegerField(min_value=1, required=False)
    depreciation_method = serializers.ChoiceField(
        choices=FixedAsset.DepreciationMethod.choices, required=False
    )
    depreciation_rate = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, default=0
    )
    gl_asset = serializers.UUIDField()
    gl_accumulated = serializers.UUIDField()
    gl_expense = serializers.UUIDField()
    branch = serializers.UUIDField(required=False, allow_null=True)
    cost_center = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class DepreciationRunSerializer(serializers.Serializer):
    period = serializers.CharField(max_length=7)
