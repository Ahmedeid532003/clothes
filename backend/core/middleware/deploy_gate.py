"""بوابة دخول VPS — على REST API فقط (لا تلمس Admin ولا static)."""
from django.conf import settings
from django.http import JsonResponse

DEPLOY_HEADER = "HTTP_X_MAHALY_DEPLOY_KEY"
DEPLOY_COOKIE = "mahaly_deploy_key"

# مسارات API العامة بدون بوابة VPS
API_PUBLIC_PREFIXES = (
    "/api/v1/health/",
    "/api/v1/deploy/unlock/",
)


class DeployGateMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, "DEPLOY_GATE_ENABLED", False)
        self.access_code = getattr(settings, "DEPLOY_ACCESS_CODE", "")

    def __call__(self, request):
        if not self.enabled or not self.access_code:
            return self.get_response(request)

        # طلبات CORS preflight (OPTIONS) يجب أن تمر لـ CorsMiddleware
        if request.method == "OPTIONS":
            return self.get_response(request)

        path = request.path
        # Admin / static / media / favicon — بدون بوابة
        if not path.startswith("/api/v1/"):
            return self.get_response(request)

        if any(path.startswith(p) for p in API_PUBLIC_PREFIXES):
            return self.get_response(request)

        provided = request.META.get(DEPLOY_HEADER, "").strip()
        if not provided:
            provided = request.COOKIES.get(DEPLOY_COOKIE, "").strip()

        if provided == self.access_code:
            return self.get_response(request)

        return JsonResponse(
            {"detail": "مطلوب كلمة دخول النظام (بوابة VPS)."},
            status=401,
        )
