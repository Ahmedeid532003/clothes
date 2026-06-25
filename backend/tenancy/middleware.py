from django.http import JsonResponse

from saas.models import Tenant
from saas.subscription_policy import evaluate_tenant_subscription
from tenancy.context import clear_current_tenant, set_current_tenant
from tenancy.services import ensure_tenant_connection

TENANT_HEADER = "HTTP_X_TENANT_SLUG"
PUBLIC_PATH_PREFIXES = (
    "/admin/",
    "/api/schema/",
    "/api/docs/",
    "/api/v1/health/",
    "/api/v1/deploy/unlock/",
    "/api/v1/saas/plans/",
    "/static/",
    "/media/",
)

AUTH_PATHS = (
    "/api/v1/auth/login/",
    "/api/v1/auth/refresh/",
)


class TenantMiddleware:
    """
    يحدد المنشأة من:
    - هيدر X-Tenant-Slug (تطوير + React)
    - subdomain: magy.localhost → magy
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        clear_current_tenant()

        if request.method == "OPTIONS":
            return self.get_response(request)

        if self._is_public(request.path):
            return self.get_response(request)

        slug = self._resolve_slug(request)
        if not slug and request.path in AUTH_PATHS:
            return JsonResponse(
                {"detail": "مطلوب هيدر X-Tenant-Slug لتسجيل الدخول."},
                status=400,
            )
        if not slug:
            if request.path.startswith("/api/"):
                return JsonResponse(
                    {"detail": "مطلوب تحديد المنشأة (X-Tenant-Slug أو subdomain)."},
                    status=400,
                )
            return self.get_response(request)

        try:
            tenant = Tenant.objects.select_related("plan").prefetch_related(
                "subscriptions"
            ).get(slug=slug)
        except Tenant.DoesNotExist:
            return JsonResponse({"detail": "المنشأة غير موجودة."}, status=404)

        evaluate_tenant_subscription(tenant)
        tenant.refresh_from_db(fields=["status", "updated_at"])

        if tenant.status == Tenant.Status.FROZEN:
            return JsonResponse(
                {
                    "detail": "يرجى سداد الاشتراك والتواصل مع الدعم الفني.",
                    "code": "tenant_frozen",
                },
                status=403,
            )
        if tenant.status in (Tenant.Status.SUSPENDED, Tenant.Status.PROVISIONING):
            return JsonResponse(
                {"detail": "حساب المنشأة غير متاح حالياً."},
                status=403,
            )

        ensure_tenant_connection(tenant)
        set_current_tenant(tenant)
        request.tenant = tenant
        return self.get_response(request)

    def _is_public(self, path: str) -> bool:
        return any(path.startswith(p) for p in PUBLIC_PATH_PREFIXES)

    def _resolve_slug(self, request) -> str | None:
        header = request.META.get(TENANT_HEADER)
        if header:
            return header.strip().lower()

        host = request.get_host().split(":")[0]
        parts = host.split(".")
        if len(parts) >= 2 and parts[0] not in ("www", "localhost", "127"):
            return parts[0].lower()
        return None
