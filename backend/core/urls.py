from django.urls import path

from core.views import DeployUnlockView, HealthView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("deploy/unlock/", DeployUnlockView.as_view(), name="deploy-unlock"),
]
