from rest_framework import serializers

from erp.accounting_models import GeneralExpenseType


class GeneralExpenseTypeSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    code = serializers.CharField(read_only=True)
    name_ar = serializers.CharField()
    name_en = serializers.CharField(required=False, allow_blank=True)
    parent = serializers.UUIDField(source="parent_id", allow_null=True, required=False)
    parent_code = serializers.CharField(read_only=True, allow_null=True)
    parent_name = serializers.CharField(read_only=True, allow_null=True)
    code_segment = serializers.CharField(required=False, allow_blank=True, max_length=12)
    level = serializers.IntegerField(read_only=True)
    tree_path = serializers.CharField(read_only=True)
    path_label = serializers.CharField(read_only=True)
    gl_account = serializers.UUIDField(source="gl_account_id", allow_null=True, required=False)
    gl_account_code = serializers.CharField(read_only=True, allow_null=True)
    gl_account_name = serializers.CharField(read_only=True, allow_null=True)
    cost_center = serializers.UUIDField(source="cost_center_id", allow_null=True, required=False)
    cost_center_code = serializers.CharField(read_only=True, allow_null=True)
    cost_center_name = serializers.CharField(read_only=True, allow_null=True)
    branch = serializers.UUIDField(source="branch_id", allow_null=True, required=False)
    branch_name = serializers.CharField(read_only=True, allow_null=True)
    department = serializers.UUIDField(source="department_id", allow_null=True, required=False)
    department_name = serializers.CharField(read_only=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(read_only=True)
    children_count = serializers.IntegerField(read_only=True)


class GeneralExpenseTypeWriteSerializer(serializers.Serializer):
    name_ar = serializers.CharField()
    name_en = serializers.CharField(required=False, allow_blank=True)
    parent = serializers.UUIDField(allow_null=True, required=False)
    code = serializers.CharField(required=False, allow_blank=True, max_length=40)
    code_segment = serializers.CharField(required=False, allow_blank=True, max_length=12)
    gl_account = serializers.UUIDField(allow_null=True, required=False)
    cost_center = serializers.UUIDField(allow_null=True, required=False)
    branch = serializers.UUIDField(allow_null=True, required=False)
    department = serializers.UUIDField(allow_null=True, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
