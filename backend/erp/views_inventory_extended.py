from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.permissions import HasAnyPriceAdjustmentPage, HasPageAction
from erp.product_models import CompositeProduct, PriceAdjustment, StockCount
from erp.serializers_inventory import (
    CompositeProductSerializer,
    CompositeWriteSerializer,
    PriceAdjustmentSerializer,
    PriceAdjustmentWriteSerializer,
    StockCountSerializer,
    StockCountWriteSerializer,
)
from erp.services import inventory_extended as inv_ext
from erp.services import supplier_account as supplier_account_service
from erp.services import general_item_movement as gim_report
from erp.services import supplier_inventory_report as supplier_inv_report


class GeneralItemMovementReportView(APIView):
    """تقرير حركة أصناف عام — مشتريات، مرتجعات، مبيعات، رصيد بالفروع."""

    permission_classes = [HasPageAction]
    required_page = "general-item-movement"
    required_action = "view"

    def get(self, request):
        qp = request.query_params
        data = gim_report.general_item_movement_report(
            branch_id=qp.get("branch") or None,
            supplier_id=qp.get("supplier") or None,
            brand_id=qp.get("brand") or None,
            section_id=qp.get("section") or None,
            classification_id=qp.get("classification") or None,
            season_id=qp.get("season") or None,
            product_id=qp.get("product") or None,
            product_q=qp.get("product_q") or None,
            date_from=qp.get("date_from") or None,
            date_to=qp.get("date_to") or None,
            valuation_mode=qp.get("valuation") or "purchase",
        )
        return Response(data)


class SupplierGroupInventoryReportView(APIView):
    """مقارنة مشتريات مجموعة موردين بالرصيد والمبيعات."""

    permission_classes = [HasPageAction]
    required_page = "supplier-inventories"
    required_action = "view"

    def get(self, request):
        data = supplier_inv_report.supplier_group_inventory_report(
            supplier_group_id=request.query_params.get("supplier_group"),
            warehouse_id=request.query_params.get("warehouse"),
            season_id=request.query_params.get("season") or None,
        )
        return Response(data)


class StockValuationView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-valuation"
    required_action = "view"

    def get(self, request):
        data = inv_ext.stock_valuation_report(
            warehouse_id=request.query_params.get("warehouse"),
            season_id=request.query_params.get("season"),
            merge_by_product=request.query_params.get("merge") in ("1", "true", "yes"),
        )
        return Response(data)


class StockCountListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-count"
    required_action = "view"

    def get(self, request):
        qs = (
            StockCount.objects.using("tenant")
            .select_related(
                "warehouse",
                "branch",
                "supplier",
                "supplier_group",
                "section",
                "brand",
                "classification",
                "product",
                "scan_order",
                "addition_voucher",
                "disbursement_voucher",
            )
            .prefetch_related(
                "lines__variant__product__section",
                "lines__variant__size",
                "lines__variant__color",
            )
            .order_by("-created_at")[:200]
        )
        return Response(StockCountSerializer(qs, many=True).data)

    def post(self, request):
        self.required_action = "update"
        ser = StockCountWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        count = inv_ext.create_stock_count(data=ser.validated_data, user=request.user)
        if request.data.get("approve"):
            count = inv_ext.approve_stock_count(count.id, user=request.user)
        count = (
            StockCount.objects.using("tenant")
            .select_related(
                "warehouse",
                "branch",
                "supplier",
                "supplier_group",
                "section",
                "brand",
                "classification",
                "product",
                "scan_order",
                "addition_voucher",
                "disbursement_voucher",
            )
            .prefetch_related(
                "lines__variant__product__section",
                "lines__variant__size",
                "lines__variant__color",
            )
            .get(pk=count.pk)
        )
        return Response(StockCountSerializer(count).data, status=status.HTTP_201_CREATED)


class StockCountActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-count"
    required_action = "update"

    def post(self, request, pk, action):
        if action == "approve":
            count = inv_ext.approve_stock_count(pk, user=request.user)
        elif action == "undo":
            count = inv_ext.undo_stock_count(pk)
        elif action == "cancel":
            count = inv_ext.cancel_stock_count(pk)
        elif action == "load-order":
            scan_order_id = request.data.get("scan_order")
            if not scan_order_id:
                from erp.services import scan_order as scan_svc
                code = (request.data.get("code") or "").strip()
                if not code:
                    return Response({"detail": "رقم الأوردر مطلوب."}, status=status.HTTP_400_BAD_REQUEST)
                order = scan_svc.lookup_order_for_load(code=code)
                scan_order_id = order["id"]
            count = inv_ext.apply_scan_order_to_count(count_id=pk, scan_order_id=scan_order_id)
        else:
            return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        count = (
            StockCount.objects.using("tenant")
            .select_related(
                "warehouse",
                "branch",
                "supplier",
                "supplier_group",
                "section",
                "brand",
                "classification",
                "product",
                "scan_order",
                "addition_voucher",
                "disbursement_voucher",
            )
            .prefetch_related(
                "lines__variant__product__section",
                "lines__variant__size",
                "lines__variant__color",
            )
            .get(pk=count.pk)
        )
        return Response(StockCountSerializer(count).data)


class StockCountDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-count"

    def get(self, request, pk):
        self.required_action = "view"
        try:
            count = (
                StockCount.objects.using("tenant")
                .select_related(
                    "warehouse",
                    "branch",
                    "supplier",
                    "supplier_group",
                    "section",
                    "brand",
                    "classification",
                    "product",
                    "scan_order",
                    "addition_voucher",
                    "disbursement_voucher",
                )
                .prefetch_related(
                    "lines__variant__product__section",
                    "lines__variant__size",
                    "lines__variant__color",
                )
                .get(pk=pk)
            )
        except StockCount.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        return Response(StockCountSerializer(count).data)

    def delete(self, request, pk):
        self.required_action = "update"
        try:
            inv_ext.delete_stock_count(pk)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, pk):
        self.required_action = "update"
        try:
            count = (
                StockCount.objects.using("tenant")
                .prefetch_related("lines")
                .get(pk=pk, status=StockCount.Status.DRAFT)
            )
        except StockCount.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)

        lines = request.data.get("lines")
        if lines is not None:
            from erp.product_models import StockCountLine
            from decimal import Decimal

            for row in lines:
                line_id = row.get("id")
                if not line_id:
                    continue
                StockCountLine.objects.using("tenant").filter(
                    pk=line_id, stock_count=count
                ).update(counted_qty=Decimal(str(row.get("counted_qty", 0))))

        count = (
            StockCount.objects.using("tenant")
            .prefetch_related(
                "lines__variant__product",
                "lines__variant__size",
                "lines__variant__color",
            )
            .get(pk=pk)
        )
        return Response(StockCountSerializer(count).data)


class CompositeProductListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "composite-products"
    required_action = "view"

    def get(self, request):
        qs = (
            CompositeProduct.objects.using("tenant")
            .prefetch_related(
                "lines__variant__product",
                "lines__variant__size",
                "lines__variant__color",
            )
            .filter(is_active=True)
            .order_by("code")
        )
        return Response(CompositeProductSerializer(qs, many=True).data)

    def post(self, request):
        self.required_action = "update"
        ser = CompositeWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        composite = inv_ext.create_composite(data=ser.validated_data)
        composite = (
            CompositeProduct.objects.using("tenant")
            .prefetch_related(
                "lines__variant__product",
                "lines__variant__size",
                "lines__variant__color",
            )
            .get(pk=composite.pk)
        )
        return Response(CompositeProductSerializer(composite).data, status=status.HTTP_201_CREATED)


class CompositeProductDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "composite-products"
    required_action = "update"

    def patch(self, request, pk):
        try:
            inv_ext.update_composite(pk, data=request.data)
            composite = (
                CompositeProduct.objects.using("tenant")
                .prefetch_related(
                    "lines__variant__product",
                    "lines__variant__size",
                    "lines__variant__color",
                )
                .get(pk=pk)
            )
            return Response(CompositeProductSerializer(composite).data)
        except CompositeProduct.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            composite = CompositeProduct.objects.using("tenant").get(pk=pk)
        except CompositeProduct.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        composite.is_active = False
        composite.save(using="tenant", update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PriceAdjustmentPreviewView(APIView):
    permission_classes = [HasAnyPriceAdjustmentPage]

    def post(self, request):
        ser = PriceAdjustmentWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = inv_ext._normalize_adjustment_data(ser.validated_data)
        return Response(inv_ext.preview_price_adjustment(data=data))


class PriceAdjustmentListCreateView(APIView):
    permission_classes = [HasAnyPriceAdjustmentPage]

    def get(self, request):
        qs = (
            PriceAdjustment.objects.using("tenant")
            .select_related("supplier", "season")
            .order_by("-created_at")[:100]
        )
        return Response(PriceAdjustmentSerializer(qs, many=True).data)

    def post(self, request):
        ser = PriceAdjustmentWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = inv_ext._normalize_adjustment_data(ser.validated_data)
        adjustment = inv_ext.apply_price_adjustment(data=data, user=request.user)
        return Response(
            PriceAdjustmentSerializer(adjustment).data, status=status.HTTP_201_CREATED
        )


class OkazionNoticePreviewView(APIView):
    permission_classes = [HasAnyPriceAdjustmentPage]

    def post(self, request):
        from erp.services import okazion_notice as okz

        return Response(okz.preview_okazion_notice(data=request.data))


class OkazionNoticeApplyView(APIView):
    permission_classes = [HasAnyPriceAdjustmentPage]

    def post(self, request):
        from erp.services import okazion_notice as okz

        result = okz.apply_okazion_notice(data=request.data, user=request.user)
        return Response(result, status=status.HTTP_201_CREATED)


class OkazionNoticeListView(APIView):
    permission_classes = [HasAnyPriceAdjustmentPage]

    def get(self, request):
        from erp.services import okazion_notice as okz

        return Response(
            okz.list_okazion_notices(limit=int(request.query_params.get("limit", 200)))
        )


class OkazionNoticeDetailView(APIView):
    permission_classes = [HasAnyPriceAdjustmentPage]

    def get(self, request, pk):
        from erp.services import okazion_notice as okz

        return Response(okz.get_okazion_notice(notice_id=pk))


class StoreOfferNoticePreviewView(APIView):
    permission_classes = [HasAnyPriceAdjustmentPage]

    def post(self, request):
        from erp.services import store_offer_notice as so

        return Response(so.preview_store_offer_notice(data=request.data))


class StoreOfferNoticeApplyView(APIView):
    permission_classes = [HasAnyPriceAdjustmentPage]

    def post(self, request):
        from erp.services import store_offer_notice as so

        result = so.apply_store_offer_notice(data=request.data, user=request.user)
        return Response(result, status=status.HTTP_201_CREATED)


class StoreOfferNoticeListView(APIView):
    permission_classes = [HasAnyPriceAdjustmentPage]

    def get(self, request):
        from erp.services import store_offer_notice as so

        return Response(
            so.list_store_offer_notices(limit=int(request.query_params.get("limit", 200)))
        )


class StoreOfferNoticeDetailView(APIView):
    permission_classes = [HasAnyPriceAdjustmentPage]

    def get(self, request, pk):
        from erp.services import store_offer_notice as so

        return Response(so.get_store_offer_notice(notice_id=pk))


class SupplierAccountLedgerView(APIView):
    """كشف حساب مورد — مبيعات بتكلفة المورد + إشعارات خصم."""

    permission_classes = [HasPageAction]
    required_page = "supplier-accounts"
    required_action = "view"

    def get(self, request):
        qp = request.query_params
        if qp.get("unified") in ("1", "true", "yes"):
            from erp.services.counterparty_statement import counterparty_statement

            return Response(
                counterparty_statement(
                    supplier_id=qp.get("supplier"),
                    date_from=qp.get("from"),
                    date_to=qp.get("to"),
                    limit=int(qp.get("limit", 300)),
                )
            )
        if qp.get("statement") in ("1", "true", "yes") or qp.get("view") in (
            "detailed",
            "general",
        ):
            from erp.services.supplier_statement import supplier_account_statement

            view = qp.get("view") or "detailed"
            if view not in ("detailed", "general"):
                view = "detailed"
            return Response(
                supplier_account_statement(
                    supplier_id=qp.get("supplier"),
                    season_id=qp.get("season") or None,
                    date_from=qp.get("from") or None,
                    date_to=qp.get("to") or None,
                    view=view,
                    limit=int(qp.get("limit", 500)),
                )
            )
        return Response(
            supplier_account_service.supplier_account_ledger(
                supplier_id=qp.get("supplier"),
                date_from=qp.get("from"),
                date_to=qp.get("to"),
                limit=int(qp.get("limit", 300)),
            )
        )


class BarcodePrintView(APIView):
    required_page = "barcode-print"
    required_action = "view"

    def get_permissions(self):
        if self.request.query_params.get("okazion_notice") or self.request.query_params.get(
            "store_offer_notice"
        ):
            return [HasAnyPriceAdjustmentPage()]
        return [HasPageAction()]

    def get(self, request):
        from erp.services import okazion_notice as okz
        from erp.services import store_offer_notice as so

        okazion_notice_id = request.query_params.get("okazion_notice")
        store_offer_notice_id = request.query_params.get("store_offer_notice")
        branch_id = request.query_params.get("branch")
        if store_offer_notice_id and branch_id:
            labels = so.store_offer_barcode_labels(
                notice_id=store_offer_notice_id,
                branch_id=branch_id,
                limit=int(request.query_params.get("limit", 500)),
            )
            return Response(labels)
        if okazion_notice_id and branch_id:
            labels = okz.okazion_barcode_labels(
                notice_id=okazion_notice_id,
                branch_id=branch_id,
                warehouse_id=request.query_params.get("warehouse"),
                limit=int(request.query_params.get("limit", 500)),
            )
            return Response(labels)

        labels = inv_ext.barcode_labels(
            warehouse_id=request.query_params.get("warehouse"),
            q=request.query_params.get("q", ""),
            product_id=request.query_params.get("product"),
            purchase_invoice_id=request.query_params.get("purchase_invoice"),
            price_adjustment_id=request.query_params.get("price_adjustment"),
            limit=int(request.query_params.get("limit", 500)),
        )
        return Response(labels)


class ScanOrderListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "scan-orders"
    required_action = "view"

    def get(self, request):
        from erp.services import scan_order as so

        return Response(
            so.list_scan_orders(
                order_type=request.query_params.get("order_type"),
                status=request.query_params.get("status"),
            )
        )

    def post(self, request):
        from erp.branch_context import get_request_branch
        from erp.services import scan_order as so

        self.required_action = "update"
        branch = get_request_branch(request)
        return Response(
            so.create_scan_order(branch=branch, data=request.data, user=request.user),
            status=201,
        )


class ScanOrderDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "scan-orders"
    required_action = "view"

    def get(self, request, pk):
        from erp.services import scan_order as so

        return Response(so.get_scan_order(pk))


class ScanOrderActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "scan-orders"
    required_action = "update"

    def post(self, request, pk, action):
        from erp.services import scan_order as so

        if action == "scan":
            return Response(
                so.scan_barcode(
                    order_id=pk,
                    barcode=request.data.get("barcode", ""),
                    quantity=request.data.get("quantity"),
                )
            )
        if action == "save":
            return Response(so.save_scan_order(pk, user=request.user))
        if action == "print":
            return Response(so.mark_order_printed(pk))
        if action == "load":
            return Response(
                so.mark_order_loaded(pk, target=request.data.get("target", ""))
            )
        if action == "line":
            return Response(
                so.update_scan_order_line(
                    order_id=pk,
                    line_id=request.data.get("line_id"),
                    quantity=request.data.get("quantity"),
                )
            )
        return Response({"detail": "إجراء غير معروف"}, status=400)


class ScanOrderLookupView(APIView):
    permission_classes = [HasPageAction]
    required_page = "scan-orders"
    required_action = "view"

    def get(self, request):
        from erp.services import scan_order as so

        code = request.query_params.get("code", "")
        return Response(so.lookup_order_for_load(code=code))


class ScanOrderEmployeeLookupView(APIView):
    permission_classes = [HasPageAction]
    required_page = "scan-orders"
    required_action = "view"

    def get(self, request):
        from erp.services import scan_order as so

        emp = so.resolve_employee(employee_code=request.query_params.get("code", ""))
        return Response(
            {
                "id": str(emp.id),
                "employee_code": emp.employee_code or "",
                "full_name": emp.full_name or emp.username,
            }
        )
