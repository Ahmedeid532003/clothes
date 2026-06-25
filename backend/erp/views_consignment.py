"""واجهات أمانات المحلات."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.consignment_models import ConsignmentMovement
from erp.permissions import HasAnyCustomerModulePage, HasPageAction
from erp.services import consignment as consignment_service


class ConsignmentDashboardView(APIView):
    permission_classes = [HasAnyCustomerModulePage]
    customer_pages = ("customer-consignment", "customers")

    def get(self, request):
        from erp.consignment_models import ConsignmentBalance

        if not ConsignmentBalance.objects.using("tenant").exists():
            consignment_service.seed_consignment_demo()
        return Response(consignment_service.consignment_dashboard())


class ConsignmentMovementListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-consignment"
    required_action = "view"

    def get(self, request):
        return Response(
            consignment_service.list_movements(
                movement_type=request.query_params.get("type"),
                customer_id=request.query_params.get("customer"),
                status=request.query_params.get("status"),
            )
        )

    def post(self, request):
        self.required_action = "update"
        return Response(
            consignment_service.create_movement(request.data, request.user),
            status=status.HTTP_201_CREATED,
        )


class ConsignmentMovementDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-consignment"
    required_action = "view"

    def get(self, request, pk):
        return Response(consignment_service.get_movement(pk))

    def delete(self, request, pk):
        self.required_action = "delete"
        consignment_service.soft_delete_movement(pk, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConsignmentMovementApproveView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-consignment"
    required_action = "update"

    def post(self, request, pk):
        return Response(consignment_service.approve_movement(pk, request.user))


class ConsignmentMovementCancelView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-consignment"
    required_action = "update"

    def post(self, request, pk):
        return Response(consignment_service.cancel_movement(pk, request.user))


class ConsignmentCustomerBalanceView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-consignment"
    required_action = "view"

    def get(self, request, customer_id):
        return Response(consignment_service.customer_balance_report(customer_id))


class ConsignmentCustomerCountSheetView(APIView):
    permission_classes = [HasAnyCustomerModulePage]
    customer_pages = ("customer-stock-count", "customer-consignment")

    def get(self, request, customer_id):
        warehouse_id = request.query_params.get("warehouse")
        return Response(
            consignment_service.customer_count_sheet(customer_id, warehouse_id=warehouse_id)
        )

    def post(self, request, customer_id):
        """معاينة تقرير الجرد بعد إدخال الكميات الفعلية."""
        self.required_action = "update"
        counted_lines = request.data.get("lines") or []
        return Response(
            consignment_service.customer_count_result(customer_id, counted_lines=counted_lines)
        )


class ConsignmentRealtimeSalesView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-consignment"
    required_action = "view"

    def get(self, request, customer_id):
        return Response(consignment_service.realtime_sales_for_customer(customer_id))


class ConsignmentReportsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-consignment"
    required_action = "view"

    def get(self, request):
        return Response(consignment_service.consignment_reports_summary())
