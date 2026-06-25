from django.conf import settings
from django.db import connection
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.middleware.deploy_gate import DEPLOY_COOKIE


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_ok = True
        except Exception:
            pass

        return Response(
            {
                "status": "ok" if db_ok else "degraded",
                "database": "connected" if db_ok else "unavailable",
            }
        )


class DeployUnlockView(APIView):
    """يفتح جلسة بوابة VPS (كوكي على منفذ API) للواجهة على منفذ آخر."""

    permission_classes = [AllowAny]

    def post(self, request):
        expected = getattr(settings, "DEPLOY_ACCESS_CODE", "")
        if not expected:
            return Response({"ok": True})

        code = (request.data.get("code") or request.data.get("password") or "").strip()
        if code != expected:
            return Response(
                {"detail": "كلمة الدخول غير صحيحة."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response({"ok": True})
        response.set_cookie(
            DEPLOY_COOKIE,
            code,
            max_age=60 * 60 * 12,
            httponly=True,
            samesite="Lax",
            secure=False,
        )
        return response
