import logging

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from erp.branch_access import branches_for_user
from erp.models import Branch, Season, User, Warehouse
from erp.serializers import (
    BranchSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    SeasonSerializer,
    TenantTokenRefreshSerializer,
    UserSerializer,
    WarehouseSerializer,
)
from erp.tokens import build_tokens_for_user
from saas.tenant_payload import tenant_api_payload
from tenancy.context import get_current_tenant


def _session_key(tenant_slug: str, user_id: str) -> str:
    return f"tenant:{tenant_slug}:session:{user_id}"


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        tenant = get_current_tenant()
        if not tenant:
            return Response(
                {"detail": "مطلوب تحديد المنشأة (X-Tenant-Slug)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"].lower()
        password = serializer.validated_data["password"]

        try:
            user = User.objects.using("tenant").get(username=username, is_active=True)
        except User.DoesNotExist:
            return Response(
                {
                    "detail": "بيانات الدخول غير صحيحة. تأكد من كود المحل "
                    f"({tenant.slug}) واسم المستخدم وكلمة المرور."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {
                    "detail": "بيانات الدخول غير صحيحة. تأكد من كود المحل "
                    f"({tenant.slug}) واسم المستخدم وكلمة المرور."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        active_key = _session_key(tenant.slug, str(user.pk))
        if cache.get(active_key) and tenant.plan.max_concurrent_users <= 1:
            return Response(
                {
                    "detail": "تم الوصول للحد الأقصى للمستخدمين المتزامنين. "
                    "يرجى إغلاق الجلسة على جهاز آخر أو ترقية الباقة."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            cache.set(active_key, "1", timeout=60 * 60 * 12)
        except Exception:
            logger.warning(
                "Cache unavailable for tenant %s — login continues without session lock.",
                tenant.slug,
                exc_info=True,
            )
        tokens = build_tokens_for_user(user, tenant.slug)
        user = (
            User.objects.using("tenant")
            .select_related("default_branch")
            .prefetch_related("allowed_branches")
            .get(pk=user.pk)
        )
        return Response(
            {
                **tokens,
                "user": UserSerializer(user, context={"request": request}).data,
                "tenant": tenant_api_payload(tenant),
            }
        )


class LogoutView(APIView):
    def post(self, request):
        tenant = get_current_tenant()
        if tenant and request.user.is_authenticated:
            cache.delete(_session_key(tenant.slug, str(request.user.pk)))
        return Response({"detail": "تم تسجيل الخروج."})


class MeView(APIView):
    def get(self, request):
        tenant = get_current_tenant()
        user = (
            User.objects.using("tenant")
            .select_related("default_branch")
            .prefetch_related("allowed_branches")
            .get(pk=request.user.pk)
        )
        return Response(
            {
                "user": UserSerializer(user, context={"request": request}).data,
                "tenant": tenant_api_payload(tenant) if tenant else None,
            }
        )


class ProfileView(APIView):
    """الملف الشخصي للمستخدم الحالي."""

    def get(self, request):
        user = User.objects.using("tenant").get(pk=request.user.pk)
        return Response(UserSerializer(user, context={"request": request}).data)

    def patch(self, request):
        user = User.objects.using("tenant").get(pk=request.user.pk)
        if str(request.data.get("remove_avatar", "")).lower() in ("1", "true", "yes"):
            user.avatar = None
            user.save(using="tenant", update_fields=["avatar", "updated_at"])

        serializer = ProfileUpdateSerializer(
            user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(using="tenant")
        user.refresh_from_db()
        return Response(UserSerializer(user, context={"request": request}).data)


class TenantTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    serializer_class = TenantTokenRefreshSerializer


class BranchListView(APIView):
    def get(self, request):
        qs = branches_for_user(request.user)
        return Response(
            BranchSerializer(qs, many=True, context={"request": request}).data
        )


class WarehouseListView(APIView):
    def get(self, request):
        qs = Warehouse.objects.using("tenant").filter(is_active=True)
        return Response(WarehouseSerializer(qs, many=True).data)


class SeasonListView(APIView):
    def get(self, request):
        qs = Season.objects.using("tenant").all()
        return Response(SeasonSerializer(qs, many=True).data)
