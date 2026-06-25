from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.permissions import HasPageAction
from erp.purchase_api_guard import guard_purchase_db
from erp.purchase_models import PurchaseInvoice
from erp.serializers_inventory import ProductSerializer
from erp.serializers_purchases import (
    PurchaseInvoiceSerializer,
    PurchaseInvoiceWriteSerializer,
    QuickCreateProductSerializer,
)
from erp.services import purchases as purchase_service


class _PurchaseInvoiceListCreateBase(APIView):
    permission_classes = [HasPageAction]
    required_action = "view"
    invoice_type = "purchase"

    @guard_purchase_db
    def get(self, request):
        qs = (
            PurchaseInvoice.objects.using("tenant")
            .filter(invoice_type=self.invoice_type)
            .select_related(
                "supplier",
                "season",
                "brand",
                "warehouse",
                "branch",
                "created_by",
                "source_invoice",
            )
            .prefetch_related(
                "lines__variant__product",
                "lines__variant__size",
                "lines__variant__color",
            )
            .order_by("-invoice_date", "-created_at")[:300]
        )
        return Response(PurchaseInvoiceSerializer(qs, many=True).data)

    @guard_purchase_db
    def post(self, request):
        self.required_action = "update"

        ser = PurchaseInvoiceWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        invoice = purchase_service.create_purchase_invoice(
            data=ser.validated_data,
            user=request.user,
            invoice_type=self.invoice_type,
        )
        if request.data.get("receive"):
            invoice = purchase_service.receive_purchase_invoice(invoice.id, request.user)

        invoice = (
            PurchaseInvoice.objects.using("tenant")
            .prefetch_related(
                "lines__variant__product",
                "lines__variant__size",
                "lines__variant__color",
            )
            .select_related("supplier", "season", "brand", "warehouse", "branch", "created_by")
            .get(pk=invoice.pk)
        )
        return Response(PurchaseInvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class PurchaseInvoiceListCreateView(_PurchaseInvoiceListCreateBase):
    required_page = "purchase-invoices"
    invoice_type = "purchase"


class PurchaseReturnListCreateView(_PurchaseInvoiceListCreateBase):
    required_page = "purchase-return-invoices"
    invoice_type = "return"


def _load_invoice(pk):
    return (
        PurchaseInvoice.objects.using("tenant")
        .prefetch_related(
            "lines__variant__product",
            "lines__variant__size",
            "lines__variant__color",
        )
        .select_related(
            "supplier",
            "season",
            "brand",
            "warehouse",
            "branch",
            "created_by",
            "source_invoice",
        )
        .get(pk=pk)
    )


def _page_key_for_invoice(invoice) -> str:
    return (
        "purchase-return-invoices"
        if invoice.invoice_type == "return"
        else "purchase-invoices"
    )


class PurchaseInvoiceDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "purchase-invoices"
    required_action = "view"

    @guard_purchase_db
    def get(self, request, pk):
        try:
            invoice = _load_invoice(pk)
        except PurchaseInvoice.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        self.required_page = _page_key_for_invoice(invoice)
        return Response(PurchaseInvoiceSerializer(invoice).data)

    @guard_purchase_db
    def patch(self, request, pk):
        self.required_action = "update"
        try:
            invoice = PurchaseInvoice.objects.using("tenant").get(pk=pk)
        except PurchaseInvoice.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        self.required_page = _page_key_for_invoice(invoice)
        ser = PurchaseInvoiceWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        invoice = purchase_service.update_purchase_invoice(pk, data=ser.validated_data)
        return Response(PurchaseInvoiceSerializer(_load_invoice(invoice.pk)).data)

    @guard_purchase_db
    def delete(self, request, pk):
        self.required_action = "delete"
        try:
            invoice = PurchaseInvoice.objects.using("tenant").get(pk=pk)
        except PurchaseInvoice.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        self.required_page = _page_key_for_invoice(invoice)
        purchase_service.delete_purchase_invoice(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PurchaseInvoiceReceiveView(APIView):
    permission_classes = [HasPageAction]
    required_page = "purchase-invoices"
    required_action = "update"

    @guard_purchase_db
    def post(self, request, pk):
        try:
            invoice = PurchaseInvoice.objects.using("tenant").get(pk=pk)
        except PurchaseInvoice.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        self.required_page = (
            "purchase-return-invoices"
            if invoice.invoice_type == "return"
            else "purchase-invoices"
        )
        invoice = purchase_service.receive_purchase_invoice(pk, request.user)
        invoice = (
            PurchaseInvoice.objects.using("tenant")
            .prefetch_related(
                "lines__variant__product",
                "lines__variant__size",
                "lines__variant__color",
            )
            .select_related("supplier", "season", "brand", "warehouse", "branch", "created_by")
            .get(pk=invoice.pk)
        )
        return Response(PurchaseInvoiceSerializer(invoice).data)


class PurchaseInvoiceCancelView(APIView):
    permission_classes = [HasPageAction]
    required_page = "purchase-invoices"
    required_action = "delete"

    def post(self, request, pk):
        try:
            invoice = PurchaseInvoice.objects.using("tenant").get(pk=pk)
        except PurchaseInvoice.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        self.required_page = (
            "purchase-return-invoices"
            if invoice.invoice_type == "return"
            else "purchase-invoices"
        )
        invoice = purchase_service.cancel_purchase_invoice(pk)
        return Response(PurchaseInvoiceSerializer(invoice).data)


class PurchaseProductsLookupView(APIView):
    """PDF: بحث ذكي — مورد + موسم + براند + نص بحث."""

    permission_classes = [HasPageAction]
    required_page = "purchase-invoices"
    required_action = "view"

    def get(self, request):
        compare = request.query_params.get("compare") in ("1", "true", "yes")
        qs = purchase_service.search_products_for_purchase(
            supplier_id=request.query_params.get("supplier"),
            season_id=request.query_params.get("season"),
            brand_id=request.query_params.get("brand"),
            section_id=request.query_params.get("section"),
            classification_id=request.query_params.get("classification"),
            query=request.query_params.get("q", ""),
            compare_mode=compare,
        )
        warehouse_id = request.query_params.get("warehouse")
        return Response(
            purchase_service.serialize_purchase_lookup_products(
                qs,
                warehouse_id=warehouse_id,
                invoice_supplier_id=request.query_params.get("supplier"),
                invoice_season_id=request.query_params.get("season"),
            )
        )


class PurchaseQuickCreateProductView(APIView):
    """PDF: إنشاء صنف من شاشة فاتورة الشراء."""

    permission_classes = [HasPageAction]
    required_page = "purchase-invoices"
    required_action = "update"

    def post(self, request):
        from erp.product_models import Product

        ser = QuickCreateProductSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        created = purchase_service.quick_create_product_for_purchase(
            data=ser.validated_data
        )
        product = (
            Product.objects.using("tenant")
            .select_related("brand", "section", "supplier", "season")
            .prefetch_related("variants__size", "variants__color")
            .get(pk=created.pk)
        )
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
