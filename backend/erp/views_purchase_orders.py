from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.permissions import HasPurchaseModulePage
from erp.purchase_api_guard import guard_purchase_db
from erp.serializers_purchase_orders import (
    CreateOrdersFromReorderSerializer,
    ReceivePurchaseOrderSerializer,
)
from erp.services import purchase_orders as po_service
from erp.services.reorder_alerts import build_reorder_alerts


class ReorderAlertsView(APIView):
    permission_classes = [HasPurchaseModulePage]
    required_page = "reorder-alerts"
    required_action = "view"

    @guard_purchase_db
    def get(self, request):
        season_id = request.query_params.get("season")
        data = build_reorder_alerts(season_id=season_id or None)
        return Response(data)


class PurchaseOrderListView(APIView):
    permission_classes = [HasPurchaseModulePage]
    required_page = "purchase-orders"
    required_action = "view"

    @guard_purchase_db
    def get(self, request):
        status_filter = request.query_params.get("status") or None
        supplier_id = request.query_params.get("supplier") or None
        rows = po_service.list_orders(status=status_filter, supplier_id=supplier_id)
        return Response(rows)


class PurchaseOrderDetailView(APIView):
    permission_classes = [HasPurchaseModulePage]
    required_page = "purchase-orders"
    required_action = "view"

    @guard_purchase_db
    def get(self, request, pk):
        from erp.purchase_order_models import PurchaseOrder

        try:
            order = po_service._load_order(pk)
        except PurchaseOrder.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        return Response(po_service.serialize_order(order))


class CreateOrdersFromReorderView(APIView):
    permission_classes = [HasPurchaseModulePage]
    required_page = "reorder-alerts"
    required_action = "update"

    @guard_purchase_db
    def post(self, request):
        ser = CreateOrdersFromReorderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        orders = po_service.create_orders_from_reorder(
            lines_data=ser.validated_data["lines"],
            user=request.user,
        )
        return Response({"orders": orders, "count": len(orders)}, status=status.HTTP_201_CREATED)


class PurchaseOrderReceiveView(APIView):
    permission_classes = [HasPurchaseModulePage]
    required_page = "purchase-orders"
    required_action = "update"

    @guard_purchase_db
    def post(self, request, pk):
        ser = ReceivePurchaseOrderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        order = po_service.receive_order_lines(
            order_id=str(pk),
            lines_data=ser.validated_data["lines"],
        )
        return Response(order)
