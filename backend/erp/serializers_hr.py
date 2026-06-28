from rest_framework import serializers

from erp.models import Department, User
from erp.permissions_schema import (
    SYSTEM_PAGES,
    PAGE_FEATURES,
    effective_user_permissions,
    merge_permissions,
)


def _user_label(user: User | None) -> str:
    if not user:
        return ""
    return user.full_name or user.username


def _user_avatar_url(user: User | None) -> str:
    if not user:
        return ""
    profile = getattr(user, "employee_profile", None)
    extra = getattr(profile, "extra_data", {}) or {}
    photo_url = str(extra.get("photo_url") or "").strip()
    if photo_url:
        return photo_url
    avatar = getattr(user, "avatar", None)
    if avatar:
        try:
            return avatar.url
        except Exception:
            return ""
    return ""


class AuditMixin(serializers.Serializer):
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    created_by_avatar_url = serializers.SerializerMethodField()
    updated_by_avatar_url = serializers.SerializerMethodField()

    def get_created_by_name(self, obj):
        return _user_label(getattr(obj, "created_by", None))

    def get_updated_by_name(self, obj):
        return _user_label(getattr(obj, "updated_by", None))

    def get_created_by_avatar_url(self, obj):
        return _user_avatar_url(getattr(obj, "created_by", None))

    def get_updated_by_avatar_url(self, obj):
        return _user_avatar_url(getattr(obj, "updated_by", None))


class DepartmentSerializer(AuditMixin, serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = (
            "id",
            "code",
            "name",
            "manager_name",
            "operational_budget",
            "description",
            "is_active",
            "created_by_name",
            "created_by_avatar_url",
            "created_at",
            "updated_by_name",
            "updated_by_avatar_url",
            "updated_at",
        )
        read_only_fields = fields


class DepartmentWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    manager_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    operational_budget = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        min_value=0,
    )
    description = serializers.CharField(required=False, allow_blank=True)


class HrSectionSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    department_id = serializers.UUIDField()
    department_code = serializers.CharField(read_only=True)
    department_name = serializers.CharField(read_only=True)
    code = serializers.CharField()
    name = serializers.CharField()
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class HrSectionWriteSerializer(serializers.Serializer):
    department_id = serializers.UUIDField()
    name = serializers.CharField(max_length=200)
    code = serializers.CharField(max_length=20, required=False, allow_blank=True)


class WorkShiftSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    code = serializers.CharField()
    name = serializers.CharField()
    name_en = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    period_count = serializers.IntegerField(read_only=True)
    employee_count = serializers.IntegerField(read_only=True)
    weekly_schedule = serializers.ListField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class WorkShiftWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    name_en = serializers.CharField(required=False, allow_blank=True, max_length=200)
    code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    period_count = serializers.IntegerField(required=False, min_value=1, max_value=3)
    weekly_schedule = serializers.ListField(required=False)


class EmployeeSerializer(AuditMixin, serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True, default="")
    department_code = serializers.CharField(source="department.code", read_only=True, default="")
    hr_section_name = serializers.CharField(source="hr_section.name", read_only=True, default="")
    hr_section_code = serializers.CharField(source="hr_section.code", read_only=True, default="")
    work_shift_name = serializers.CharField(source="work_shift.name", read_only=True, default="")
    work_shift_code = serializers.CharField(source="work_shift.code", read_only=True, default="")
    permissions = serializers.SerializerMethodField()
    allowed_branch_ids = serializers.SerializerMethodField()
    hire_date = serializers.SerializerMethodField()
    uses_system = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "employee_code",
            "username",
            "full_name",
            "email",
            "phone",
            "department",
            "department_name",
            "department_code",
            "hr_section",
            "hr_section_name",
            "hr_section_code",
            "work_shift",
            "work_shift_name",
            "work_shift_code",
            "hire_date",
            "uses_system",
            "is_active",
            "is_owner",
            "permissions",
            "branch_access_mode",
            "default_branch",
            "allowed_branch_ids",
            "created_by_name",
            "created_at",
            "updated_by_name",
            "updated_at",
        )
        read_only_fields = fields

    def get_permissions(self, obj):
        return effective_user_permissions(obj)

    def get_allowed_branch_ids(self, obj):
        if obj.branch_access_mode == User.BranchAccessMode.ALL:
            return None
        if obj.branch_access_mode == User.BranchAccessMode.SINGLE:
            return [str(obj.default_branch_id)] if obj.default_branch_id else []
        return [str(pk) for pk in obj.allowed_branches.values_list("id", flat=True)]

    def get_uses_system(self, obj):
        return obj.has_usable_password()

    def get_hire_date(self, obj):
        try:
            profile = obj.employee_profile
        except Exception:
            profile = None
        return profile.hire_date if profile else None


class EmployeeWriteSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(max_length=128, write_only=True, required=False)
    uses_system = serializers.BooleanField(required=False, default=True)
    hire_date = serializers.DateField(required=False, allow_null=True)
    full_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    employee_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    hr_section_id = serializers.UUIDField(required=False, allow_null=True)
    work_shift_id = serializers.UUIDField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)
    permissions = serializers.JSONField(required=False)
    grant_all_permissions = serializers.BooleanField(required=False, default=False)
    branch_access_mode = serializers.ChoiceField(
        choices=User.BranchAccessMode.choices,
        required=False,
        default=User.BranchAccessMode.ALL,
    )
    default_branch_id = serializers.UUIDField(required=False, allow_null=True)
    allowed_branch_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )

    def validate_username(self, value):
        return value.strip().lower()


class EmployeeLimitsSerializer(serializers.Serializer):
    current_users = serializers.IntegerField()
    max_users = serializers.IntegerField()
    can_add = serializers.BooleanField()
    plan_name = serializers.CharField()


class PermissionsSchemaSerializer(serializers.Serializer):
    pages = serializers.ListField()
    features = serializers.DictField()
    actions = serializers.ListField()

    @staticmethod
    def build():
        seen: set[str] = set()
        pages: list[dict] = []
        for page in SYSTEM_PAGES:
            key = page["key"]
            if key in seen:
                continue
            seen.add(key)
            pages.append(page)
        return {
            "pages": pages,
            "features": PAGE_FEATURES,
            "actions": ["view", "update", "delete"],
        }
