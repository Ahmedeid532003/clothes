from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from erp.models import User
from saas.models import Tenant
from tenancy.context import set_current_tenant
from tenancy.services import ensure_tenant_connection


class TenantJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        tenant_slug = validated_token.get(settings.JWT_TENANT_CLAIM)
        user_id = validated_token.get("user_id")

        if not tenant_slug or not user_id:
            raise InvalidToken("رمز الدخول غير صالح.")

        try:
            tenant = Tenant.objects.get(slug=tenant_slug, status=Tenant.Status.ACTIVE)
        except Tenant.DoesNotExist:
            raise InvalidToken("المنشأة غير متاحة.")

        ensure_tenant_connection(tenant)
        set_current_tenant(tenant)

        try:
            return User.objects.using("tenant").get(pk=user_id, is_active=True)
        except User.DoesNotExist:
            raise InvalidToken("المستخدم غير موجود.")
