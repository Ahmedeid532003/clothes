"""واجهات الموردين — أنواع، مجموعات، دفع، بيانات مساعدة."""

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.permissions import (
    HasAnySupplierModulePage,
    HasPageAction,
    SupplierCatalogWrite,
    SupplierMasterDataRead,
)
from erp.supplier_api_guard import guard_supplier_db
from erp.serializers_inventory import (
    SupplierCategorySerializer,
    SupplierDepartmentSerializer,
    SupplierGroupSerializer,
    SupplierPaymentSerializer,
    SupplierPaymentWriteSerializer,
    SupplierTypeSerializer,
)
from erp.services import catalog as catalog_service
from erp.services import suppliers as supplier_service
from erp.supplier_models import (
    SupplierCategory,
    SupplierDepartment,
    SupplierGroup,
    SupplierType,
    SupplierWeeklyInventoryReport,
)
from erp.services.supplier_weekly_inventory import (
    create_weekly_report,
    run_daily_supplier_inventory,
    serialize_report,
)


class SupplierMetaView(APIView):
    permission_classes = [HasAnySupplierModulePage]

    @guard_supplier_db
    def get(self, request):
        if (
            SupplierType.objects.using("tenant").filter(is_active=True).count() == 0
            or SupplierGroup.objects.using("tenant").filter(is_active=True).count() == 0
            or SupplierCategory.objects.using("tenant").filter(is_active=True).count() == 0
            or SupplierDepartment.objects.using("tenant").filter(is_active=True).count() == 0
        ):
            supplier_service.seed_supplier_defaults()
        return Response(supplier_service.supplier_meta())


class SupplierTypeListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-types"
    required_action = "view"

    @guard_supplier_db
    def get(self, request):
        if SupplierType.objects.using("tenant").filter(is_active=True).count() == 0:
            supplier_service.seed_supplier_defaults()
        qs = SupplierType.objects.using("tenant").filter(is_active=True).order_by("code")
        return Response(SupplierTypeSerializer(qs, many=True).data)

    @guard_supplier_db
    def post(self, request):
        self.required_action = "update"
        code = (request.data.get("code") or "").strip() or catalog_service._next_code(
            "ST", SupplierType
        )
        item = SupplierType.objects.using("tenant").create(
            code=code,
            name_ar=request.data["name_ar"],
            name_en=request.data.get("name_en", ""),
            entity_kind=request.data.get(
                "entity_kind", SupplierType.EntityKind.ESTABLISHMENT
            ),
            description=request.data.get("description", ""),
            is_system=False,
        )
        return Response(SupplierTypeSerializer(item).data, status=status.HTTP_201_CREATED)


class SupplierTypeDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-types"
    required_action = "update"

    def patch(self, request, pk):
        try:
            item = SupplierType.objects.using("tenant").get(pk=pk, is_active=True)
        except SupplierType.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        for field in ("name_ar", "name_en", "description"):
            if field in request.data:
                setattr(item, field, request.data[field])
        if "entity_kind" in request.data and not item.is_system:
            item.entity_kind = request.data["entity_kind"]
        item.save(using="tenant")
        return Response(SupplierTypeSerializer(item).data)

    def delete(self, request, pk):
        try:
            item = SupplierType.objects.using("tenant").get(pk=pk, is_active=True)
        except SupplierType.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if item.is_system:
            raise ValidationError("لا يمكن حذف نوع مورد افتراضي من النظام.")
        catalog_service.soft_delete(item)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SupplierGroupListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-groups"
    required_action = "view"

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [SupplierMasterDataRead()]
        return [HasPageAction()]

    @guard_supplier_db
    def get(self, request):
        if SupplierGroup.objects.using("tenant").filter(is_active=True).count() == 0:
            supplier_service.seed_supplier_defaults()
        qs = SupplierGroup.objects.using("tenant").filter(is_active=True).order_by("code")
        return Response(SupplierGroupSerializer(qs, many=True).data)

    @guard_supplier_db
    def post(self, request):
        self.required_action = "update"
        code = (request.data.get("code") or "").strip() or catalog_service._next_code(
            "SG", SupplierGroup
        )
        item = SupplierGroup.objects.using("tenant").create(
            code=code,
            name_ar=request.data["name_ar"],
            name_en=request.data.get("name_en", ""),
            settlement_mode=request.data.get(
                "settlement_mode", SupplierGroup.SettlementMode.CONSIGNMENT
            ),
            description=request.data.get("description", ""),
            is_system=False,
        )
        return Response(SupplierGroupSerializer(item).data, status=status.HTTP_201_CREATED)


class SupplierGroupDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-groups"
    required_action = "update"

    def patch(self, request, pk):
        try:
            item = SupplierGroup.objects.using("tenant").get(pk=pk, is_active=True)
        except SupplierGroup.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        for field in ("name_ar", "name_en", "description"):
            if field in request.data:
                setattr(item, field, request.data[field])
        if "settlement_mode" in request.data and not item.is_system:
            item.settlement_mode = request.data["settlement_mode"]
        item.save(using="tenant")
        return Response(SupplierGroupSerializer(item).data)

    def delete(self, request, pk):
        try:
            item = SupplierGroup.objects.using("tenant").get(pk=pk, is_active=True)
        except SupplierGroup.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if item.is_system:
            raise ValidationError("لا يمكن حذف مجموعة مورد افتراضية من النظام.")
        catalog_service.soft_delete(item)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SupplierCategoryListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-categories"
    required_action = "view"

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [SupplierMasterDataRead()]
        return [SupplierCatalogWrite()]

    @guard_supplier_db
    def get(self, request):
        if SupplierCategory.objects.using("tenant").filter(is_active=True).count() == 0:
            supplier_service.seed_supplier_defaults()
        qs = SupplierCategory.objects.using("tenant").filter(is_active=True).order_by("code")
        return Response(SupplierCategorySerializer(qs, many=True).data)

    @guard_supplier_db
    def post(self, request):
        self.required_action = "update"
        code = (request.data.get("code") or "").strip() or catalog_service._next_code(
            "SCAT", SupplierCategory
        )
        item = SupplierCategory.objects.using("tenant").create(
            code=code,
            name_ar=request.data["name_ar"],
            name_en=request.data.get("name_en", ""),
            category_kind=request.data.get(
                "category_kind", SupplierCategory.CategoryKind.OTHER
            ),
            description=request.data.get("description", ""),
            is_system=False,
        )
        return Response(SupplierCategorySerializer(item).data, status=status.HTTP_201_CREATED)


class SupplierCategoryDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-categories"
    required_action = "update"

    def patch(self, request, pk):
        try:
            item = SupplierCategory.objects.using("tenant").get(pk=pk, is_active=True)
        except SupplierCategory.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        for field in ("name_ar", "name_en", "description"):
            if field in request.data:
                setattr(item, field, request.data[field])
        if "category_kind" in request.data and not item.is_system:
            item.category_kind = request.data["category_kind"]
        item.save(using="tenant")
        return Response(SupplierCategorySerializer(item).data)

    def delete(self, request, pk):
        try:
            item = SupplierCategory.objects.using("tenant").get(pk=pk, is_active=True)
        except SupplierCategory.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if item.is_system:
            raise ValidationError("لا يمكن حذف مجموعة تصنيف افتراضية من النظام.")
        catalog_service.soft_delete(item)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SupplierDepartmentListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-departments"
    required_action = "view"

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [SupplierMasterDataRead()]
        return [SupplierCatalogWrite()]

    @guard_supplier_db
    def get(self, request):
        if SupplierDepartment.objects.using("tenant").filter(is_active=True).count() == 0:
            supplier_service.seed_supplier_defaults()
        qs = SupplierDepartment.objects.using("tenant").filter(is_active=True).order_by("code")
        return Response(SupplierDepartmentSerializer(qs, many=True).data)

    @guard_supplier_db
    def post(self, request):
        self.required_action = "update"
        code = (request.data.get("code") or "").strip() or catalog_service._next_code(
            "SDPT", SupplierDepartment
        )
        item = SupplierDepartment.objects.using("tenant").create(
            code=code,
            name_ar=request.data["name_ar"],
            name_en=request.data.get("name_en", ""),
            dept_kind=request.data.get(
                "dept_kind", SupplierDepartment.DeptKind.OTHER
            ),
            description=request.data.get("description", ""),
            is_system=False,
        )
        return Response(SupplierDepartmentSerializer(item).data, status=status.HTTP_201_CREATED)


class SupplierDepartmentDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-departments"
    required_action = "update"

    def patch(self, request, pk):
        try:
            item = SupplierDepartment.objects.using("tenant").get(pk=pk, is_active=True)
        except SupplierDepartment.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        for field in ("name_ar", "name_en", "description"):
            if field in request.data:
                setattr(item, field, request.data[field])
        if "dept_kind" in request.data and not item.is_system:
            item.dept_kind = request.data["dept_kind"]
        item.save(using="tenant")
        return Response(SupplierDepartmentSerializer(item).data)

    def delete(self, request, pk):
        try:
            item = SupplierDepartment.objects.using("tenant").get(pk=pk, is_active=True)
        except SupplierDepartment.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if item.is_system:
            raise ValidationError("لا يمكن حذف قسم مورد افتراضي من النظام.")
        catalog_service.soft_delete(item)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SupplierPaymentListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-payments"
    required_action = "view"

    def get(self, request):
        from erp.supplier_models import SupplierPayment

        qs = (
            SupplierPayment.objects.using("tenant")
            .select_related("supplier", "payment_paper")
            .order_by("-created_at")[:200]
        )
        supplier_id = request.query_params.get("supplier")
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return Response(SupplierPaymentSerializer(qs, many=True).data)

    def post(self, request):
        self.required_action = "update"
        ser = SupplierPaymentWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payment = supplier_service.create_supplier_payment(
            data=ser.validated_data, user=request.user
        )
        if request.data.get("approve"):
            payment = supplier_service.approve_supplier_payment(payment.id, request.user)
        payment = (
            SupplierPayment.objects.using("tenant")
            .select_related("supplier", "payment_paper")
            .get(pk=payment.pk)
        )
        return Response(
            SupplierPaymentSerializer(payment).data, status=status.HTTP_201_CREATED
        )


class SupplierPaymentActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-payments"
    required_action = "update"

    def post(self, request, pk, action):
        from erp.supplier_models import SupplierPayment

        try:
            if action == "approve":
                payment = supplier_service.approve_supplier_payment(pk, request.user)
            elif action == "cancel":
                payment = supplier_service.cancel_supplier_payment(pk)
            else:
                return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError:
            raise
        except SupplierPayment.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        payment = (
            SupplierPayment.objects.using("tenant")
            .select_related("supplier", "payment_paper")
            .get(pk=pk)
        )
        return Response(SupplierPaymentSerializer(payment).data)


class SupplierWeeklyInventoryReportListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-weekly-reports"
    required_action = "view"

    @guard_supplier_db
    def get(self, request):
        qs = (
            SupplierWeeklyInventoryReport.objects.using("tenant")
            .select_related("supplier")
            .order_by("-report_date", "-created_at")
        )
        supplier_id = (request.query_params.get("supplier") or "").strip()
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        report_date = (request.query_params.get("report_date") or "").strip()
        if report_date:
            qs = qs.filter(report_date=report_date)
        limit = min(int(request.query_params.get("limit") or 200), 500)
        return Response([serialize_report(r) for r in qs[:limit]])

    @guard_supplier_db
    def post(self, request):
        self.required_action = "update"
        supplier_id = (request.data.get("supplier") or "").strip()
        if not supplier_id:
            raise ValidationError("حدد المورد.")
        report = create_weekly_report(supplier_id=supplier_id)
        report = (
            SupplierWeeklyInventoryReport.objects.using("tenant")
            .select_related("supplier")
            .get(pk=report.pk)
        )
        return Response(serialize_report(report), status=status.HTTP_201_CREATED)


class SupplierWeeklyInventoryReportDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-weekly-reports"
    required_action = "view"

    @guard_supplier_db
    def get(self, request, pk):
        try:
            report = (
                SupplierWeeklyInventoryReport.objects.using("tenant")
                .select_related("supplier")
                .get(pk=pk)
            )
        except SupplierWeeklyInventoryReport.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_report(report))


class SupplierWeeklyInventoryRunDailyView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-weekly-reports"
    required_action = "update"

    @guard_supplier_db
    def post(self, request):
        return Response(run_daily_supplier_inventory())


class SupplierWeeklyInventoryMarkSentView(APIView):
    permission_classes = [HasPageAction]
    required_page = "supplier-weekly-reports"
    required_action = "update"

    @guard_supplier_db
    def post(self, request, pk):
        from django.utils import timezone

        try:
            report = SupplierWeeklyInventoryReport.objects.using("tenant").get(pk=pk)
        except SupplierWeeklyInventoryReport.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        report.status = SupplierWeeklyInventoryReport.Status.SENT
        report.whatsapp_sent_at = timezone.now()
        report.save(using="tenant", update_fields=["status", "whatsapp_sent_at"])
        report = (
            SupplierWeeklyInventoryReport.objects.using("tenant")
            .select_related("supplier")
            .get(pk=pk)
        )
        return Response(serialize_report(report))
