"""Respond to load-balancer health probes before tenant/API middleware."""
from django.db import connection
from django.http import JsonResponse


def _probe_path(request) -> str:
    return (request.path_info or request.path or "").rstrip("/") or "/"


class HealthBypassMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = _probe_path(request)
        if path in ("/api/v1/health", "/"):
            db_ok = False
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                db_ok = True
            except Exception:
                pass
            return JsonResponse(
                {
                    "status": "ok" if db_ok else "degraded",
                    "database": "connected" if db_ok else "unavailable",
                }
            )
        return self.get_response(request)
