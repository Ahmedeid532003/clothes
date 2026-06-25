from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.branch_context import get_request_branch
from erp.permissions import HasPageAction, HasPosOrBarcodePage
from erp.sale_models import Sale, SaleLine, SalePayment, SaleReturn
from erp.serializers_pos import (
    DeliveryOrderUpdateSerializer,
    SaleSerializer,
    SaleWriteSerializer,
    PosExchangeWriteSerializer,
)
from erp.services import pos as pos_service
from erp.services import pos_customers as pos_customers_service


class PosContextView(APIView):
    """سياق نقطة البيع = الفرع النشط (من الباقة، بدون إضافة فروع)."""

    permission_classes = [HasPageAction]
    required_page = "pos"
    required_action = "view"

    def get(self, request):
        branch = get_request_branch(request, required=True)
        return Response(pos_service.get_pos_context(branch))


class PosProductSearchView(APIView):
    permission_classes = [HasPosOrBarcodePage]
    required_page = "pos-barcode"
    required_action = "view"

    def get(self, request):
        from erp.branch_context import get_branch_sale_warehouse
        from erp.services.catalog import get_current_season

        branch = get_request_branch(request, required=True)
        warehouse = get_branch_sale_warehouse(branch)
        season = get_current_season()
        in_stock = request.query_params.get("in_stock", "").lower() in ("1", "true", "yes")
        if in_stock:
            products = pos_service.list_in_stock_products(
                warehouse_id=warehouse.id,
                season_id=season.id,
            )
            return Response({"products": products, "composites": []})
        results = pos_service.search_pos_catalog(
            warehouse_id=warehouse.id,
            season_id=season.id,
            query=request.query_params.get("q", ""),
            barcode=request.query_params.get("barcode", ""),
        )
        return Response(results)


class PosSaleListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "pos"
    required_action = "view"

    def get(self, request):
        branch = get_request_branch(request, required=True)
        qs = (
            Sale.objects.using("tenant")
            .filter(branch=branch)
            .select_related("branch", "created_by", "customer")
            .prefetch_related(
                "lines__variant__product",
                "lines__variant__size",
                "lines__variant__color",
                "lines__composite_product",
            )
            .order_by("-created_at")
        )
        code = (request.query_params.get("code") or "").strip()
        if code:
            qs = qs.filter(code__icontains=code)[:20]
        else:
            qs = qs[:100]
        return Response(SaleSerializer(qs, many=True).data)

    def post(self, request):
        self.required_action = "update"
        branch = get_request_branch(request, required=True)
        ser = SaleWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sale = pos_service.create_sale(branch=branch, user=request.user, data=ser.validated_data)
        installment_receipt = getattr(sale, "_installment_receipt", None)
        sale = (
            Sale.objects.using("tenant")
            .prefetch_related(
                "lines__variant__product",
                "lines__variant__size",
                "lines__variant__color",
                "lines__composite_product",
            )
            .select_related("branch", "created_by")
            .get(pk=sale.pk)
        )
        if installment_receipt:
            sale._installment_receipt = installment_receipt
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


class PosExchangeView(APIView):
    permission_classes = [HasPageAction]
    required_page = "pos"
    required_action = "update"

    def post(self, request):
        branch = get_request_branch(request, required=True)
        ser = PosExchangeWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = pos_service.create_pos_exchange(
            branch=branch,
            user=request.user,
            data=ser.validated_data,
        )
        return Response(result, status=status.HTTP_201_CREATED)


class PosCustomerReviewListView(APIView):
    """قائمة عملاء — تحصيل ومراجعة مع تقييم ألوان تلقائي/يدوي."""

    permission_classes = [HasPageAction]
    required_page = "pos-barcode"
    required_action = "view"

    def get(self, request):
        return Response(
            pos_customers_service.pos_customer_review_list(
                search=request.query_params.get("q", ""),
            )
        )


class PosSellerListView(APIView):
    permission_classes = [HasPosOrBarcodePage]
    required_page = "pos-barcode"
    required_action = "view"

    def get(self, request):
        return Response(pos_service.list_pos_sellers())


class PosSellerLookupView(APIView):
    permission_classes = [HasPosOrBarcodePage]
    required_page = "pos-barcode"
    required_action = "view"

    def get(self, request):
        emp = pos_service.resolve_pos_seller(code=request.query_params.get("code", ""))
        return Response(
            {
                "id": str(emp.id),
                "employee_code": emp.employee_code or "",
                "full_name": emp.full_name or emp.username,
                "username": emp.username,
            }
        )


class PosCustomerOpenDocsView(APIView):
    """حجوزات وعروض أسعار مفتوحة لعميل — لتحميلها في تبويب البيع."""

    permission_classes = [HasPosOrBarcodePage]
    required_page = "pos-barcode"
    required_action = "view"

    def get(self, request, pk):
        return Response(pos_customers_service.pos_customer_open_documents(customer_id=pk))


class PosDeliveryOrdersView(APIView):
    """قائمة فواتير الدليفري مع إجمالي مصاريف التوصيل."""

    permission_classes = [HasPosOrBarcodePage]
    required_page = "pos-barcode"
    required_action = "view"

    def get(self, request):
        branch = get_request_branch(request, required=True)
        date_from = (request.query_params.get("from") or "").strip() or None
        date_to = (request.query_params.get("to") or "").strip() or None
        result = pos_service.list_delivery_orders(
            branch=branch,
            search=request.query_params.get("q", ""),
            date_from=date_from,
            date_to=date_to,
            agent_id=(request.query_params.get("agent") or "").strip() or None,
            status=(request.query_params.get("status") or "").strip(),
        )
        orders = SaleSerializer(result["orders"], many=True).data
        return Response({**result["summary"], "orders": orders})


class PosDeliveryOrderDetailView(APIView):
    permission_classes = [HasPosOrBarcodePage]
    required_page = "pos-barcode"
    required_action = "view"

    def get(self, request, pk):
        branch = get_request_branch(request, required=True)
        sale = (
            Sale.objects.using("tenant")
            .filter(branch=branch, pk=pk)
            .select_related("branch", "created_by", "customer", "delivery_agent")
            .prefetch_related(
                "lines__variant__product",
                "lines__variant__size",
                "lines__variant__color",
                "lines__composite_product",
                "lines__seller",
            )
            .first()
        )
        if not sale or not pos_service._sale_is_delivery(sale):
            return Response({"detail": "غير موجود"}, status=status.HTTP_404_NOT_FOUND)
        return Response(SaleSerializer(sale).data)

    def patch(self, request, pk):
        self.required_action = "update"
        ser = DeliveryOrderUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sale = pos_service.update_delivery_order(
            sale_id=pk,
            user=request.user,
            data=ser.validated_data,
        )
        return Response(SaleSerializer(sale).data)
