from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.catalog_models import (
    Brand,
    ProductClassification,
    ProductColor,
    ProductSection,
    ProductSize,
)
from erp.models import Branch, InventorySettings, Season, User, Warehouse
from erp.permissions import HasPageAction, SupplierMasterDataRead
from erp.supplier_api_guard import guard_supplier_db
from erp.product_models import (
    Product,
    ProductVariant,
    StockAddition,
    StockBalance,
    StockDisbursement,
    StockScrap,
    StockTransfer,
)
from erp.serializers_inventory import (
    BrandSerializer,
    InventorySettingsSerializer,
    ProductClassificationSerializer,
    ProductColorSerializer,
    ProductSerializer,
    ProductSectionSerializer,
    ProductSizeSerializer,
    ProductVariantWriteSerializer,
    ProductWriteSerializer,
    SeasonSerializer,
    StockBalanceSerializer,
    StockAdditionSerializer,
    StockAdditionWriteSerializer,
    StockDisbursementSerializer,
    StockDisbursementWriteSerializer,
    StockScrapSerializer,
    StockScrapWriteSerializer,
    StockTransferSerializer,
    StockTransferWriteSerializer,
    SupplierGroupSerializer,
    SupplierSerializer,
    SupplierTypeSerializer,
    WarehouseSerializer,
)
from erp.services import catalog as catalog_service
from erp.services import suppliers as supplier_service
from erp.services import stock as stock_service
from erp.supplier_models import Supplier, SupplierGroup, SupplierType


def _catalog_list_create(model, serializer_class, page_key):
    class View(APIView):
        permission_classes = [HasPageAction]
        required_page = page_key
        required_action = "view"

        def get(self, request):
            qs = model.objects.using("tenant").filter(is_active=True)
            return Response(serializer_class(qs, many=True).data)

        def post(self, request):
            self.required_action = "update"
            extra = {}
            if model is ProductClassification and request.data.get("section"):
                extra["section_id"] = request.data["section"]
            if model is ProductColor and "hex_code" in request.data:
                extra["hex_code"] = request.data.get("hex_code", "")
            item = catalog_service.create_catalog_item(
                model,
                name_ar=request.data.get("name_ar", ""),
                name_en=request.data.get("name_en", ""),
                code=request.data.get("code"),
                **extra,
            )
            return Response(serializer_class(item).data, status=status.HTTP_201_CREATED)

    return View


def _catalog_detail(model, serializer_class, page_key):
    class View(APIView):
        permission_classes = [HasPageAction]
        required_page = page_key
        required_action = "update"

        def patch(self, request, pk):
            try:
                item = model.objects.using("tenant").get(pk=pk, is_active=True)
            except model.DoesNotExist:
                return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
            extra = {}
            if model is ProductClassification and "section" in request.data:
                extra["section_id"] = request.data["section"]
            if model is ProductColor and "hex_code" in request.data:
                extra["hex_code"] = request.data.get("hex_code", "")
            item = catalog_service.update_catalog_item(
                item,
                name_ar=request.data.get("name_ar"),
                name_en=request.data.get("name_en"),
                **extra,
            )
            return Response(serializer_class(item).data)

        def delete(self, request, pk):
            try:
                item = model.objects.using("tenant").get(pk=pk, is_active=True)
            except model.DoesNotExist:
                return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
            catalog_service.soft_delete(item)
            return Response(status=status.HTTP_204_NO_CONTENT)

    return View


ProductSectionListCreateView = _catalog_list_create(ProductSection, ProductSectionSerializer, "product-sections")
ProductSectionDetailView = _catalog_detail(ProductSection, ProductSectionSerializer, "product-sections")
BrandListCreateView = _catalog_list_create(Brand, BrandSerializer, "brands")
BrandDetailView = _catalog_detail(Brand, BrandSerializer, "brands")
ClassificationListCreateView = _catalog_list_create(ProductClassification, ProductClassificationSerializer, "classifications")
ClassificationDetailView = _catalog_detail(ProductClassification, ProductClassificationSerializer, "classifications")
SizeListCreateView = _catalog_list_create(ProductSize, ProductSizeSerializer, "sizes")
SizeDetailView = _catalog_detail(ProductSize, ProductSizeSerializer, "sizes")
ColorListCreateView = _catalog_list_create(ProductColor, ProductColorSerializer, "colors")
ColorDetailView = _catalog_detail(ProductColor, ProductColorSerializer, "colors")
class SupplierListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "suppliers"
    required_action = "view"

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [SupplierMasterDataRead()]
        return [HasPageAction()]

    @guard_supplier_db
    def get(self, request):
        qs = Supplier.objects.using("tenant").filter(is_active=True).select_related(
            "supplier_type",
            "supplier_group",
            "supplier_category",
            "supplier_department",
        )
        entity_kind = (request.query_params.get("entity_kind") or "").strip()
        if entity_kind:
            qs = qs.filter(supplier_type__entity_kind=entity_kind)
        settlement_mode = (request.query_params.get("settlement_mode") or "").strip()
        if settlement_mode:
            qs = qs.filter(supplier_group__settlement_mode=settlement_mode)
        supplier_type_id = (request.query_params.get("supplier_type") or "").strip()
        if supplier_type_id:
            qs = qs.filter(supplier_type_id=supplier_type_id)
        supplier_group_id = (request.query_params.get("supplier_group") or "").strip()
        if supplier_group_id:
            qs = qs.filter(supplier_group_id=supplier_group_id)
        return Response(SupplierSerializer(qs, many=True).data)

    @guard_supplier_db
    def post(self, request):
        self.required_action = "update"
        st, sg = supplier_service.resolve_supplier_refs(
            entity_kind=request.data.get("entity_kind"),
            settlement_mode=request.data.get("settlement_mode"),
            supplier_type_id=request.data.get("supplier_type"),
            supplier_group_id=request.data.get("supplier_group"),
        )
        item = catalog_service.create_catalog_item(
            Supplier,
            name_ar=request.data["name_ar"],
            name_en=request.data.get("name_en", ""),
            code=request.data.get("code"),
            supplier_type_id=st.id,
            supplier_group_id=sg.id,
            phone=request.data.get("phone", ""),
            whatsapp=request.data.get("whatsapp", ""),
            notes=request.data.get("notes", ""),
            contact_name=request.data.get("contact_name", ""),
            contact_title=request.data.get("contact_title", ""),
            supplier_category_id=request.data.get("supplier_category") or None,
            supplier_department_id=request.data.get("supplier_department") or None,
            weekly_inventory_day=request.data.get("weekly_inventory_day", ""),
            is_also_customer=bool(request.data.get("is_also_customer")),
        )
        if request.data.get("is_also_customer"):
            from erp.services.supplier_customer_link import sync_supplier_customer_role

            sync_supplier_customer_role(
                supplier=item, is_also_customer=True, user=request.user
            )
            item.refresh_from_db(using="tenant")
        return Response(SupplierSerializer(item).data, status=status.HTTP_201_CREATED)


class SupplierDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "suppliers"
    required_action = "update"

    def patch(self, request, pk):
        try:
            item = Supplier.objects.using("tenant").get(pk=pk, is_active=True)
        except Supplier.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        for field in (
            "name_ar",
            "name_en",
            "contact_name",
            "contact_title",
            "phone",
            "whatsapp",
            "notes",
            "supplier_category",
            "supplier_department",
            "weekly_inventory_day",
            "is_also_customer",
        ):
            if field in request.data:
                value = request.data[field]
                if field in ("supplier_category", "supplier_department") and not value:
                    value = None
                if field == "is_also_customer":
                    value = bool(value)
                setattr(item, field, value)
        if "is_also_customer" in request.data:
            from erp.services.supplier_customer_link import sync_supplier_customer_role

            sync_supplier_customer_role(
                supplier=item,
                is_also_customer=bool(request.data.get("is_also_customer")),
                user=request.user,
            )
            item.refresh_from_db(using="tenant")
        if any(
            k in request.data
            for k in ("supplier_type", "supplier_group", "entity_kind", "settlement_mode")
        ):
            st, sg = supplier_service.resolve_supplier_refs(
                entity_kind=request.data.get("entity_kind"),
                settlement_mode=request.data.get("settlement_mode"),
                supplier_type_id=request.data.get("supplier_type"),
                supplier_group_id=request.data.get("supplier_group"),
            )
            item.supplier_type_id = st.id
            item.supplier_group_id = sg.id
        item.save(using="tenant")
        return Response(SupplierSerializer(item).data)

    def delete(self, request, pk):
        try:
            item = Supplier.objects.using("tenant").get(pk=pk, is_active=True)
        except Supplier.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        catalog_service.soft_delete(item)
        return Response(status=status.HTTP_204_NO_CONTENT)


class WarehouseListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "warehouses"
    required_action = "view"

    def get(self, request):
        qs = Warehouse.objects.using("tenant").filter(is_active=True).select_related("primary_branch")
        return Response(WarehouseSerializer(qs, many=True).data)

    def post(self, request):
        self.required_action = "update"
        name_ar = request.data.get("name_ar", "").strip()
        if not name_ar:
            raise ValidationError("اسم المخزن مطلوب.")
        branch_id = request.data.get("primary_branch_id") or request.data.get("primary_branch")
        if not branch_id:
            raise ValidationError("الفرع مطلوب.")
        try:
            branch = Branch.objects.using("tenant").get(pk=branch_id, is_active=True)
        except Branch.DoesNotExist:
            raise ValidationError("الفرع غير موجود.")
        code = (request.data.get("code") or slugify(name_ar) or "wh")[:50]
        if Warehouse.objects.using("tenant").filter(code=code).exists():
            code = catalog_service._next_code("WH", Warehouse)
        wh = Warehouse.objects.using("tenant").create(
            code=code,
            name_ar=name_ar,
            name_en=request.data.get("name_en", name_ar),
            manager_name=(request.data.get("manager_name") or "").strip(),
            primary_branch=branch,
        )
        return Response(WarehouseSerializer(wh).data, status=status.HTTP_201_CREATED)


class WarehouseDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "warehouses"
    required_action = "update"

    def patch(self, request, pk):
        try:
            wh = Warehouse.objects.using("tenant").get(pk=pk, is_active=True)
        except Warehouse.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if "code" in request.data:
            code = (request.data.get("code") or "").strip()
            if code and code != wh.code:
                if Warehouse.objects.using("tenant").filter(code=code).exclude(pk=pk).exists():
                    return Response({"detail": "كود المخزن مستخدم."}, status=status.HTTP_400_BAD_REQUEST)
                wh.code = code
        from erp.services import branches as branch_service

        if branch_service.is_sale_outlet_warehouse(wh.id) and "code" in request.data:
            raise ValidationError("لا يمكن تغيير كود منفذ البيع المرتبط بالفرع.")
        if "primary_branch_id" in request.data or "primary_branch" in request.data:
            if branch_service.is_sale_outlet_warehouse(wh.id):
                raise ValidationError("ربط منفذ البيع بالفرع يتم تلقائياً.")
            branch_id = request.data.get("primary_branch_id") or request.data.get("primary_branch")
            if branch_id:
                try:
                    wh.primary_branch = Branch.objects.using("tenant").get(pk=branch_id, is_active=True)
                except Branch.DoesNotExist:
                    raise ValidationError("الفرع غير موجود.")
            else:
                raise ValidationError("الفرع مطلوب.")
        for field in ("name_ar", "name_en", "manager_name"):
            if field in request.data:
                setattr(wh, field, request.data[field])
        wh.save(using="tenant")
        return Response(WarehouseSerializer(wh).data)

    def delete(self, request, pk):
        from erp.services import branches as branch_service

        try:
            wh = Warehouse.objects.using("tenant").get(pk=pk, is_active=True)
        except Warehouse.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if branch_service.is_sale_outlet_warehouse(wh.id):
            raise ValidationError(
                "لا يمكن حذف مخزن منفذ البيع — كل فرع له منفذ واحد يُدار من الفروع."
            )
        wh.is_active = False
        wh.save(using="tenant", update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SeasonListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "seasons"
    required_action = "view"

    def get(self, request):
        qs = Season.objects.using("tenant").all()
        return Response(SeasonSerializer(qs, many=True).data)

    def post(self, request):
        self.required_action = "update"
        name_ar = request.data.get("name_ar", "").strip()
        code = (request.data.get("code") or slugify(name_ar) or "season")[:50]
        if Season.objects.using("tenant").filter(code=code).exists():
            code = catalog_service._next_code("SN", Season)
        is_current = bool(request.data.get("is_current"))
        if is_current:
            Season.objects.using("tenant").filter(is_current=True).update(is_current=False)
        barcode_next = int(request.data.get("barcode_next_number") or 100000)
        season = Season.objects.using("tenant").create(
            code=code,
            name_ar=name_ar,
            name_en=request.data.get("name_en", name_ar),
            is_open=bool(request.data.get("is_open", True)),
            is_current=is_current,
            starts_at=request.data.get("starts_at"),
            ends_at=request.data.get("ends_at"),
            barcode_prefix=(request.data.get("barcode_prefix") or "").strip(),
            barcode_next_number=barcode_next,
        )
        return Response(SeasonSerializer(season).data, status=status.HTTP_201_CREATED)


class SeasonDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "seasons"
    required_action = "update"

    def patch(self, request, pk):
        try:
            season = Season.objects.using("tenant").get(pk=pk)
        except Season.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if request.data.get("is_current"):
            Season.objects.using("tenant").exclude(pk=pk).update(is_current=False)
            season.is_current = True
        for field in (
            "name_ar",
            "name_en",
            "is_open",
            "starts_at",
            "ends_at",
            "barcode_prefix",
            "barcode_next_number",
        ):
            if field in request.data:
                setattr(season, field, request.data[field])
        season.save(using="tenant")
        return Response(SeasonSerializer(season).data)


class InventorySettingsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "products"
    required_action = "view"

    def get(self, request):
        settings, _ = InventorySettings.objects.using("tenant").get_or_create(pk=1)
        return Response(InventorySettingsSerializer(settings).data)

    def patch(self, request):
        self.required_action = "update"
        settings, _ = InventorySettings.objects.using("tenant").get_or_create(pk=1)
        ser = InventorySettingsSerializer(settings, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save(using="tenant")
        return Response(ser.data)


class ProductNextBarcodeView(APIView):
    permission_classes = [HasPageAction]
    required_page = "products"
    required_action = "view"

    def get(self, request):
        season_id = request.query_params.get("season")
        size_id = request.query_params.get("size")
        color_id = request.query_params.get("color")
        if season_id:
            try:
                season = Season.objects.using("tenant").get(pk=season_id)
            except Season.DoesNotExist:
                return Response({"detail": "الموسم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        else:
            season = catalog_service.get_current_season()

        size = None
        color = None
        if size_id:
            try:
                size = ProductSize.objects.using("tenant").get(pk=size_id, is_active=True)
            except ProductSize.DoesNotExist:
                return Response({"detail": "المقاس غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if color_id:
            try:
                color = ProductColor.objects.using("tenant").get(pk=color_id, is_active=True)
            except ProductColor.DoesNotExist:
                return Response({"detail": "اللون غير موجود."}, status=status.HTTP_404_NOT_FOUND)

        prefix = catalog_service.build_barcode_prefix(season=season, size=size, color=color)
        return Response(
            {
                "barcode": catalog_service.peek_next_barcode(season, size=size, color=color),
                "season_id": str(season.id),
                "barcode_prefix": prefix,
                "size_code": size.code if size else None,
                "color_code": color.code if color else None,
            }
        )


class ProductBarcodePreviewView(APIView):
    permission_classes = [HasPageAction]
    required_page = "products"
    required_action = "view"

    def get(self, request):
        season_id = request.query_params.get("season")
        if not season_id:
            return Response({"detail": "حدد الموسم."}, status=status.HTTP_400_BAD_REQUEST)
        size_ids = [x for x in request.query_params.get("sizes", "").split(",") if x.strip()]
        color_ids = [x for x in request.query_params.get("colors", "").split(",") if x.strip()]
        try:
            rows = catalog_service.barcode_previews(
                season_id=season_id,
                size_ids=size_ids,
                color_ids=color_ids,
            )
        except Season.DoesNotExist:
            return Response({"detail": "الموسم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"rows": rows})


class ProductListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "products"
    required_action = "view"

    def get(self, request):
        qs = (
            Product.objects.using("tenant")
            .filter(is_active=True)
            .select_related("brand", "section", "classification", "supplier", "season")
            .prefetch_related("variants__size", "variants__color")
        )
        return Response(ProductSerializer(qs, many=True).data)

    def post(self, request):
        self.required_action = "update"
        ser = ProductWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        product = catalog_service.create_product(data=ser.validated_data)
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


class ProductDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "products"
    required_action = "view"

    def get(self, request, pk):
        try:
            product = (
                Product.objects.using("tenant")
                .filter(is_active=True)
                .select_related("brand", "section", "classification", "supplier", "season")
                .prefetch_related("variants__size", "variants__color")
                .get(pk=pk)
            )
        except Product.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProductSerializer(product).data)

    def patch(self, request, pk):
        self.required_action = "update"
        try:
            product = Product.objects.using("tenant").get(pk=pk, is_active=True)
        except Product.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        ser = ProductWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if "code" in data and data["code"]:
            code = data["code"].strip()
            if Product.objects.using("tenant").filter(code=code).exclude(pk=pk).exists():
                return Response({"detail": "كود الصنف مستخدم."}, status=status.HTTP_400_BAD_REQUEST)
            product.code = code
        for field in ("barcode", "name_ar", "name_en", "description", "offer_price", "reorder_percent"):
            if field in data:
                setattr(product, field, data[field])
        for fk in ("brand", "section", "classification", "supplier", "season"):
            if fk in data:
                setattr(product, f"{fk}_id", data[fk])
        if "purchase_price" in data:
            product.purchase_price = data["purchase_price"]
        if "markup_percent" in data:
            product.markup_percent = data["markup_percent"]
        if "sale_price" in data and data["sale_price"] is not None:
            product.sale_price = data["sale_price"]
        elif "purchase_price" in data or "markup_percent" in data:
            product.sale_price = catalog_service.compute_sale_price(
                product.purchase_price, product.markup_percent
            )
        product.save(using="tenant")
        return Response(ProductSerializer(product).data)

    def delete(self, request, pk):
        try:
            product = Product.objects.using("tenant").get(pk=pk, is_active=True)
        except Product.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        product.is_active = False
        product.save(using="tenant", update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class StockBalanceListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-balances"
    required_action = "view"

    def get(self, request):
        qs = (
            StockBalance.objects.using("tenant")
            .select_related(
                "warehouse",
                "variant__product",
                "variant__size",
                "variant__color",
            )
            .order_by("warehouse__code", "variant__product__code")
        )
        warehouse_id = request.query_params.get("warehouse")
        if warehouse_id:
            qs = qs.filter(warehouse_id=warehouse_id)
        return Response(StockBalanceSerializer(qs, many=True).data)


class ProductVariantSyncView(APIView):
    permission_classes = [HasPageAction]
    required_page = "products"
    required_action = "update"

    def post(self, request, pk):
        try:
            product = Product.objects.using("tenant").get(pk=pk, is_active=True)
        except Product.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        ser = ProductVariantWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        catalog_service.sync_product_variants(
            product,
            size_ids=ser.validated_data["size_ids"],
            color_ids=ser.validated_data["color_ids"],
        )
        product = (
            Product.objects.using("tenant")
            .prefetch_related("variants__size", "variants__color")
            .get(pk=pk)
        )
        return Response(ProductSerializer(product).data)


class StockTransferListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-transfers"
    required_action = "view"

    def get(self, request):
        qs = (
            StockTransfer.objects.using("tenant")
            .select_related(
                "from_warehouse",
                "to_warehouse",
                "from_branch",
                "to_branch",
            )
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .order_by("-created_at")[:200]
        )
        return Response(StockTransferSerializer(qs, many=True).data)

    def post(self, request):
        self.required_action = "update"
        ser = StockTransferWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        transfer = stock_service.create_transfer(
            data=ser.validated_data, user=request.user
        )
        if request.data.get("approve"):
            stock_service.approve_transfer(transfer.id, request.user)
            transfer.refresh_from_db(using="tenant")
        elif request.data.get("submit"):
            stock_service.submit_transfer(transfer.id)
            transfer.refresh_from_db(using="tenant")
        elif not transfer.requires_approval:
            stock_service.approve_transfer(
                transfer.id, request.user, skip_permission=True
            )
            transfer.refresh_from_db(using="tenant")
        transfer = (
            StockTransfer.objects.using("tenant")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .get(pk=transfer.pk)
        )
        return Response(StockTransferSerializer(transfer).data, status=status.HTTP_201_CREATED)


class StockTransferOptionsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-transfers"
    required_action = "view"

    def get(self, request):
        return Response(stock_service.transfer_options(user=request.user))


class StockTransferActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-transfers"
    required_action = "update"

    def dispatch(self, request, *args, **kwargs):
        action = kwargs.get("action")
        if request.method not in ("GET", "HEAD", "OPTIONS") and action == "approve":
            self.required_action = "approve"
        return super().dispatch(request, *args, **kwargs)

    def post(self, request, pk, action):
        try:
            if action == "submit":
                transfer = stock_service.submit_transfer(pk)
            elif action == "approve":
                self.required_action = "approve"
                if not stock_service.user_can_approve_transfer(request.user):
                    return Response(
                        {"detail": "ليس لديك صلاحية اعتماد التحويلات."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                transfer = stock_service.approve_transfer(pk, request.user)
            elif action == "cancel":
                transfer = stock_service.cancel_transfer(pk)
            else:
                return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError:
            raise
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        transfer = (
            StockTransfer.objects.using("tenant")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .get(pk=transfer.pk)
        )
        return Response(StockTransferSerializer(transfer).data)


class StockScrapListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-scrap"
    required_action = "view"

    def get(self, request):
        qs = (
            StockScrap.objects.using("tenant")
            .select_related("warehouse")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .order_by("-created_at")[:200]
        )
        return Response(StockScrapSerializer(qs, many=True).data)

    def post(self, request):
        self.required_action = "update"
        ser = StockScrapWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        scrap = stock_service.create_scrap(data=ser.validated_data, user=request.user)
        if request.data.get("approve"):
            scrap = stock_service.approve_scrap(scrap.id)
        scrap = (
            StockScrap.objects.using("tenant")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .get(pk=scrap.pk)
        )
        return Response(StockScrapSerializer(scrap).data, status=status.HTTP_201_CREATED)


class StockScrapActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-scrap"
    required_action = "update"

    def post(self, request, pk, action):
        try:
            if action == "approve":
                scrap = stock_service.approve_scrap(pk)
            elif action == "cancel":
                scrap = stock_service.cancel_scrap(pk)
            else:
                return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        scrap = (
            StockScrap.objects.using("tenant")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .get(pk=scrap.pk)
        )
        return Response(StockScrapSerializer(scrap).data)


class StockDisbursementOptionsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-disbursements"
    required_action = "view"

    def get(self, request):
        from erp.models import Warehouse

        warehouses = list(
            Warehouse.objects.using("tenant")
            .filter(is_active=True)
            .order_by("code")
            .values("id", "code", "name_ar")
        )
        for row in warehouses:
            row["id"] = str(row["id"])
        return Response(
            {
                "warehouses": warehouses,
                "purposes": stock_service.disbursement_purpose_options(),
            }
        )


class StockDisbursementListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-disbursements"
    required_action = "view"

    def get(self, request):
        qs = (
            StockDisbursement.objects.using("tenant")
            .select_related("warehouse")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .order_by("-created_at")[:200]
        )
        return Response(StockDisbursementSerializer(qs, many=True).data)

    def post(self, request):
        ser = StockDisbursementWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        voucher = stock_service.create_disbursement(
            data=ser.validated_data, user=request.user
        )
        if request.data.get("approve"):
            voucher = stock_service.approve_disbursement(voucher.id)
        voucher = (
            StockDisbursement.objects.using("tenant")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .select_related("warehouse")
            .get(pk=voucher.pk)
        )
        return Response(StockDisbursementSerializer(voucher).data, status=status.HTTP_201_CREATED)


class StockDisbursementActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-disbursements"
    required_action = "update"

    def post(self, request, pk, action):
        try:
            if action == "approve":
                voucher = stock_service.approve_disbursement(pk)
            elif action == "cancel":
                voucher = stock_service.cancel_disbursement(pk)
            else:
                return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        voucher = (
            StockDisbursement.objects.using("tenant")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .select_related("warehouse")
            .get(pk=voucher.pk)
        )
        return Response(StockDisbursementSerializer(voucher).data)


class StockAdditionOptionsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-additions"
    required_action = "view"

    def get(self, request):
        from erp.models import Warehouse

        warehouses = list(
            Warehouse.objects.using("tenant")
            .filter(is_active=True)
            .order_by("code")
            .values("id", "code", "name_ar")
        )
        for row in warehouses:
            row["id"] = str(row["id"])
        return Response(
            {
                "warehouses": warehouses,
                "purposes": stock_service.addition_purpose_options(),
            }
        )


class StockAdditionListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-additions"
    required_action = "view"

    def get(self, request):
        qs = (
            StockAddition.objects.using("tenant")
            .select_related("warehouse")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .order_by("-created_at")[:200]
        )
        return Response(StockAdditionSerializer(qs, many=True).data)

    def post(self, request):
        ser = StockAdditionWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        voucher = stock_service.create_addition(data=ser.validated_data, user=request.user)
        if request.data.get("approve"):
            voucher = stock_service.approve_addition(voucher.id)
        voucher = (
            StockAddition.objects.using("tenant")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .select_related("warehouse")
            .get(pk=voucher.pk)
        )
        return Response(StockAdditionSerializer(voucher).data, status=status.HTTP_201_CREATED)


class StockAdditionActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "stock-additions"
    required_action = "update"

    def post(self, request, pk, action):
        try:
            if action == "approve":
                voucher = stock_service.approve_addition(pk)
            elif action == "cancel":
                voucher = stock_service.cancel_addition(pk)
            else:
                return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        voucher = (
            StockAddition.objects.using("tenant")
            .prefetch_related("lines__variant__product", "lines__variant__size", "lines__variant__color")
            .select_related("warehouse")
            .get(pk=voucher.pk)
        )
        return Response(StockAdditionSerializer(voucher).data)
