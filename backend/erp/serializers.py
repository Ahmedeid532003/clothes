from django.conf import settings
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from erp.models import Branch, Season, User, Warehouse
from erp.branch_access import branches_for_user, user_branch_ids
from erp.permissions_schema import effective_user_permissions
from tenancy.context import get_current_tenant


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    branch_access_mode = serializers.CharField(read_only=True)
    allowed_branch_ids = serializers.SerializerMethodField()
    allowed_branches = serializers.SerializerMethodField()
    can_switch_all_branches = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "full_name",
            "email",
            "phone",
            "avatar_url",
            "is_owner",
            "permissions",
            "branch_access_mode",
            "default_branch",
            "allowed_branch_ids",
            "allowed_branches",
            "can_switch_all_branches",
        )

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        url = obj.avatar.url
        if request:
            try:
                return request.build_absolute_uri(url)
            except Exception:
                pass
        return url

    def get_permissions(self, obj):
        return effective_user_permissions(obj)

    def get_allowed_branch_ids(self, obj):
        ids = user_branch_ids(obj)
        if ids is None:
            return None
        return [str(i) for i in ids]

    def get_allowed_branches(self, obj):
        return BranchSerializer(
            branches_for_user(obj),
            many=True,
            context=self.context,
        ).data

    def get_can_switch_all_branches(self, obj):
        return obj.is_owner or obj.branch_access_mode == User.BranchAccessMode.ALL


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("full_name", "email", "phone", "avatar")

    def validate_avatar(self, value):
        if value and value.size > 3 * 1024 * 1024:
            raise serializers.ValidationError("حجم الصورة يجب ألا يتجاوز 3 ميجابايت.")
        return value


class BranchSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    is_sale_outlet = serializers.SerializerMethodField()
    sale_warehouse_id = serializers.SerializerMethodField()
    sale_warehouse_name = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = (
            "id",
            "code",
            "name_ar",
            "name_en",
            "address",
            "image_url",
            "is_sale_outlet",
            "sale_warehouse_id",
            "sale_warehouse_name",
            "is_active",
        )

    def get_is_sale_outlet(self, obj):
        return True

    def get_sale_warehouse_id(self, obj):
        from erp.models import BranchWarehouse

        link = (
            BranchWarehouse.objects.using("tenant")
            .filter(branch=obj, is_default=True)
            .select_related("warehouse")
            .first()
        )
        if link:
            return str(link.warehouse_id)
        return None

    def get_sale_warehouse_name(self, obj):
        from erp.models import BranchWarehouse

        link = (
            BranchWarehouse.objects.using("tenant")
            .filter(branch=obj, is_default=True)
            .select_related("warehouse")
            .first()
        )
        if link:
            return link.warehouse.name_ar
        return None

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            url = obj.image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ("id", "code", "name_ar", "name_en", "is_active")


class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = (
            "id",
            "code",
            "name_ar",
            "name_en",
            "is_open",
            "is_current",
            "starts_at",
            "ends_at",
        )


class TenantTokenRefreshSerializer(TokenRefreshSerializer):
    """Refresh JWT using tenant DB user (UUID), not Django auth.User."""

    default_error_messages = TokenRefreshSerializer.default_error_messages

    def validate(self, attrs):
        refresh = self.token_class(attrs["refresh"])

        user_id = refresh.payload.get(jwt_settings.USER_ID_CLAIM)
        token_tenant = refresh.payload.get(settings.JWT_TENANT_CLAIM)

        if user_id:
            if not token_tenant:
                raise AuthenticationFailed(
                    self.error_messages["no_active_account"],
                    "no_active_account",
                )
            tenant = get_current_tenant()
            if tenant and token_tenant != tenant.slug:
                raise AuthenticationFailed(
                    self.error_messages["no_active_account"],
                    "no_active_account",
                )
            try:
                user = User.objects.using("tenant").get(pk=user_id, is_active=True)
            except User.DoesNotExist:
                raise AuthenticationFailed(
                    self.error_messages["no_active_account"],
                    "no_active_account",
                )
            if not jwt_settings.USER_AUTHENTICATION_RULE(user):
                raise AuthenticationFailed(
                    self.error_messages["no_active_account"],
                    "no_active_account",
                )

        data = {"access": str(refresh.access_token)}

        if jwt_settings.ROTATE_REFRESH_TOKENS:
            if jwt_settings.BLACKLIST_AFTER_ROTATION:
                try:
                    refresh.blacklist()
                except AttributeError:
                    pass

            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()
            try:
                refresh.outstand()
            except AttributeError:
                pass

            data["refresh"] = str(refresh)

        return data
