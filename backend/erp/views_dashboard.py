from rest_framework.response import Response
from rest_framework.views import APIView

from erp.permissions import HasPageAction
from erp.services import control_panel_dashboard as dashboard_service


class ControlPanelDashboardView(APIView):
    """لوحة التحكم الرئيسية — بيانات مجمّعة من قاعدة البيانات."""

    permission_classes = [HasPageAction]
    required_page = "dashboard"
    required_action = "view"

    def get(self, request):
        qp = request.query_params
        data = dashboard_service.control_panel_dashboard(
            period=qp.get("period") or "today",
            date_from=qp.get("date_from"),
            date_to=qp.get("date_to"),
            branch_id=qp.get("branch") or None,
        )
        return Response(data)
