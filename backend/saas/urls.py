from django.urls import path

from saas.views import PlanListView

urlpatterns = [
    path("saas/plans/", PlanListView.as_view(), name="saas-plans"),
]
