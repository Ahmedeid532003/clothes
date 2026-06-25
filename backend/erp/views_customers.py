"""واجهات العملاء — أنواع، مجموعات، بيانات، لوحة المجموعات."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.customer_models import Customer, CustomerGroup, CustomerType
from erp.permissions import HasAnyCustomerModulePage, HasPageAction
from erp.services import customers as customer_service


class CustomerMetaView(APIView):
    permission_classes = [HasAnyCustomerModulePage]

    def get(self, request):
        if CustomerType.objects.using("tenant").filter(is_active=True).count() == 0:
            customer_service.seed_customer_defaults()
        return Response(customer_service.customer_meta())


class CustomerTypeListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-types"
    required_action = "view"

    def get(self, request):
        if CustomerType.objects.using("tenant").count() == 0:
            customer_service.seed_customer_defaults()
        include_inactive = request.query_params.get("include_inactive") == "1"
        return Response(customer_service.list_customer_types(include_inactive=include_inactive))

    def post(self, request):
        self.required_action = "update"
        return Response(
            customer_service.create_customer_type(request.data),
            status=status.HTTP_201_CREATED,
        )


class CustomerTypeDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-types"
    required_action = "update"

    def get(self, request, pk):
        return Response(customer_service.get_customer_type_form(pk))

    def patch(self, request, pk):
        return Response(customer_service.update_customer_type(pk, request.data))

    def delete(self, request, pk):
        self.required_action = "delete"
        item = CustomerType.objects.using("tenant").get(pk=pk)
        if item.is_system:
            return Response(
                {"detail": "لا يمكن حذف نوع نظام."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if item.customers.filter(is_active=True).exists():
            item.is_active = False
            item.save(using="tenant", update_fields=["is_active"])
        else:
            item.delete(using="tenant")
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerGroupListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-groups"
    required_action = "view"

    def get(self, request):
        if CustomerGroup.objects.using("tenant").filter(is_active=True).count() == 0:
            customer_service.seed_customer_defaults()
        return Response(customer_service.list_customer_groups())

    def post(self, request):
        self.required_action = "update"
        return Response(
            customer_service.create_customer_group(request.data),
            status=status.HTTP_201_CREATED,
        )


class CustomerGroupDashboardView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-groups"
    required_action = "view"

    def get(self, request):
        if CustomerGroup.objects.using("tenant").filter(is_active=True).count() == 0:
            customer_service.seed_customer_defaults()
        return Response(customer_service.groups_dashboard())


class CustomerGroupDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-groups"
    required_action = "update"

    def patch(self, request, pk):
        return Response(customer_service.update_customer_group(pk, request.data))

    def delete(self, request, pk):
        self.required_action = "delete"
        item = CustomerGroup.objects.using("tenant").get(pk=pk)
        if item.is_system:
            return Response(
                {"detail": "لا يمكن حذف مجموعة نظام."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if item.customers.filter(is_active=True).exists() or item.children.exists():
            item.is_active = False
            item.save(using="tenant", update_fields=["is_active"])
        else:
            item.delete(using="tenant")
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customers"
    required_action = "view"

    def get(self, request):
        return Response(
            customer_service.list_customers(
                group_id=request.query_params.get("group"),
                type_id=request.query_params.get("type"),
            )
        )

    def post(self, request):
        self.required_action = "update"
        return Response(
            customer_service.create_customer(request.data, request.user),
            status=status.HTTP_201_CREATED,
        )


class CustomerCheckDuplicateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customers"
    required_action = "view"

    def get(self, request):
        return Response(
            customer_service.check_customer_duplicate(
                phone=request.query_params.get("phone", ""),
                national_id=request.query_params.get("national_id", ""),
                exclude_id=request.query_params.get("exclude"),
            )
        )


class CustomerNextCodeView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customers"
    required_action = "view"

    def get(self, request):
        return Response({"code": customer_service.preview_next_customer_code()})


class CustomerPurchaseItemsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customers"
    required_action = "view"

    def get(self, request, pk):
        return Response(customer_service.customer_purchase_items(customer_id=pk))


class CustomerDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customers"
    required_action = "view"

    def get(self, request, pk):
        return Response(customer_service.get_customer_detail(pk))

    def patch(self, request, pk):
        self.required_action = "update"
        return Response(
            customer_service.update_customer(pk, request.data, request.user)
        )

    def delete(self, request, pk):
        self.required_action = "delete"
        c = Customer.objects.using("tenant").get(pk=pk)
        c.is_active = False
        c.save(using="tenant", update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)
