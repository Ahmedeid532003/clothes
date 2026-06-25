from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from saas.models import Plan
from saas.serializers import PlanSerializer


class PlanListView(ListAPIView):
    queryset = Plan.objects.filter(is_active=True)
    serializer_class = PlanSerializer
    permission_classes = [AllowAny]
