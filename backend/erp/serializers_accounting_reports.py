from rest_framework import serializers

from erp.serializer_fields import DefaultTodayDateField


class JournalLineWriteSerializer(serializers.Serializer):
    gl_account = serializers.UUIDField()
    debit = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    credit = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    memo = serializers.CharField(required=False, allow_blank=True)
    cost_center = serializers.UUIDField(required=False, allow_null=True)


class JournalEntryWriteSerializer(serializers.Serializer):
    entry_date = DefaultTodayDateField()
    description = serializers.CharField(required=False, allow_blank=True)
    branch = serializers.UUIDField(required=False, allow_null=True)
    cost_center = serializers.UUIDField(required=False, allow_null=True)
    currency = serializers.UUIDField(required=False, allow_null=True)
    lines = JournalLineWriteSerializer(many=True)


class ReportDateSerializer(serializers.Serializer):
    as_of = serializers.DateField(required=False)
    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)
    branch = serializers.UUIDField(required=False, allow_null=True)


class GeneralLedgerQuerySerializer(serializers.Serializer):
    account = serializers.UUIDField()
    from_date = serializers.DateField()
    to_date = serializers.DateField()
    branch = serializers.UUIDField(required=False, allow_null=True)
