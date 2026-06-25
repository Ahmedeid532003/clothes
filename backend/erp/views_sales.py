from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.branch_context import get_request_branch
from erp.branch_context import get_branch_sale_warehouse
from erp.permissions import HasPageAction
from erp.serializers_pos import SaleWriteSerializer
from erp.serializers_sales import (
    CustomerReservationSerializer,
    CustomerReservationWriteSerializer,
    SaleReturnSerializer,
    SaleReturnWriteSerializer,
    SalesQuotationSerializer,
    SalesQuotationWriteSerializer,
    SalesInvoiceSerializer,
)
from erp.services import pos as pos_service
from erp.services import sales as sales_service
from erp.services import seller_reports as seller_reports_service


class SalesInvoiceListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "sales-invoices"
    required_action = "view"

    def get(self, request):
        branch = None
        if request.query_params.get("branch_only") in ("1", "true"):
            branch = get_request_branch(request, required=True)
        return Response(SalesInvoiceSerializer(sales_service.list_sales(branch=branch), many=True).data)

    def post(self, request):
        self.required_action = "update"
        branch = get_request_branch(request, required=True)
        ser = SaleWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sale = pos_service.create_sale(branch=branch, user=request.user, data=ser.validated_data)
        return Response(
            SalesInvoiceSerializer(sales_service.sale_detail(sale.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class SalesInvoiceDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "sales-invoices"
    required_action = "view"

    def get(self, request, pk):
        return Response(SalesInvoiceSerializer(sales_service.sale_detail(pk)).data)


class SaleReturnListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "sales-returns"
    required_action = "view"

    def get(self, request):
        return Response(SaleReturnSerializer(sales_service.list_sale_returns(), many=True).data)

    def post(self, request):
        self.required_action = "update"
        sale_id = request.data.get("sale")
        if not sale_id:
            return Response({"detail": "حدد فاتورة البيع."}, status=status.HTTP_400_BAD_REQUEST)
        ser = SaleReturnWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ret = sales_service.create_sale_return(
            sale_id=sale_id,
            data=ser.validated_data,
            user=request.user,
        )
        return Response(SaleReturnSerializer(ret).data, status=status.HTTP_201_CREATED)


class TaxInvoiceListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "tax-invoices"
    required_action = "view"

    def get(self, request):
        rows = [s for s in sales_service.list_sales() if s.is_tax_invoice]
        return Response(SalesInvoiceSerializer(rows, many=True).data)


class SalesQuotationListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "sales-quotations"
    required_action = "view"

    def get(self, request):
        return Response(SalesQuotationSerializer(sales_service.list_quotations(), many=True).data)

    def post(self, request):
        self.required_action = "update"
        branch = get_request_branch(request, required=True)
        warehouse = get_branch_sale_warehouse(branch)
        ser = SalesQuotationWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = sales_service.create_quotation(
            branch=branch,
            warehouse=warehouse,
            data=ser.validated_data,
            user=request.user,
        )
        return Response(SalesQuotationSerializer(row).data, status=status.HTTP_201_CREATED)


class SalesQuotationActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "sales-quotations"
    required_action = "update"

    def post(self, request, pk, action):
        if action == "approve":
            row = sales_service.approve_quotation(pk)
            return Response(SalesQuotationSerializer(row).data)
        if action == "convert":
            sale = sales_service.convert_quotation_to_sale(pk, request.user)
            return Response(SalesInvoiceSerializer(sales_service.sale_detail(sale.pk)).data)
        return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)


class SalesQuotationLookupView(APIView):
    permission_classes = [HasPageAction]
    required_page = "sales-quotations"
    required_action = "view"

    def get(self, request):
        row = sales_service.lookup_quotation(code=request.query_params.get("code", ""))
        return Response(SalesQuotationSerializer(row).data)


class CustomerReservationListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-reservations"
    required_action = "view"

    def get(self, request):
        return Response(CustomerReservationSerializer(sales_service.list_reservations(), many=True).data)

    def post(self, request):
        self.required_action = "update"
        branch = get_request_branch(request, required=True)
        warehouse = get_branch_sale_warehouse(branch)
        ser = CustomerReservationWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = sales_service.create_reservation(
            branch=branch,
            warehouse=warehouse,
            data=ser.validated_data,
            user=request.user,
        )
        return Response(CustomerReservationSerializer(row).data, status=status.HTTP_201_CREATED)


class CustomerReservationActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-reservations"
    required_action = "update"

    def post(self, request, pk, action):
        if action == "convert":
            sale = sales_service.convert_reservation_to_sale(pk, request.user)
            return Response(SalesInvoiceSerializer(sales_service.sale_detail(sale.pk)).data)
        return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)


class CustomerReservationLookupView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-reservations"
    required_action = "view"

    def get(self, request):
        row = sales_service.lookup_reservation(code=request.query_params.get("code", ""))
        return Response(CustomerReservationSerializer(row).data)


class SellerPerformanceReportView(APIView):
    permission_classes = [HasPageAction]
    required_page = "seller-performance"
    required_action = "view"

    def get(self, request):
        branch = None
        if request.query_params.get("branch_only") in ("1", "true"):
            branch = get_request_branch(request, required=True)
        rows = seller_reports_service.seller_performance_report(
            branch_id=str(branch.id) if branch else None,
            date_from=request.query_params.get("from") or None,
            date_to=request.query_params.get("to") or None,
        )
        return Response(rows)

