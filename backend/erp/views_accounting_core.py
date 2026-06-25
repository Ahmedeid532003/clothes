from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.accounting_models import Currency, GlAccount
from erp.permissions import HasPageAction, can_perform_action
from erp.serializers_accounting_core import (
    ChartAccountWriteSerializer,
    CurrencyConvertSerializer,
    CurrencyWriteSerializer,
    DepreciationRunSerializer,
    FixedAssetWriteSerializer,
)
from erp.services import accounting_chart as chart_service
from erp.services import accounting_currencies as currency_service
from erp.services import accounting_depreciation as depreciation_service


class ChartOfAccountsListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "chart-of-accounts"
    required_action = "view"

    def get(self, request):
        acc_type = request.query_params.get("account_type")
        return Response(chart_service.list_chart_flat(account_type=acc_type or None))

    def post(self, request):
        self.required_action = "update"
        ser = ChartAccountWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = chart_service.create_chart_account(data=ser.validated_data)
        rows = chart_service.list_chart_flat()
        item = next((r for r in rows if r["id"] == str(row.pk)), None)
        return Response(item or {"id": str(row.pk)}, status=status.HTTP_201_CREATED)


class ChartOfAccountsDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "chart-of-accounts"
    required_action = "update"

    def patch(self, request, pk):
        try:
            row = GlAccount.objects.using("tenant").get(pk=pk, is_active=True)
        except GlAccount.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        ser = ChartAccountWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        chart_service.update_chart_account(row, data=ser.validated_data)
        rows = chart_service.list_chart_flat()
        item = next((r for r in rows if r["id"] == str(pk)), None)
        return Response(item or {"id": str(pk)})

    def delete(self, request, pk):
        try:
            row = GlAccount.objects.using("tenant").get(pk=pk, is_active=True)
        except GlAccount.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        chart_service.soft_delete_chart_account(row)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChartNextCodeView(APIView):
    permission_classes = [HasPageAction]
    required_page = "chart-of-accounts"
    required_action = "view"

    def get(self, request):
        code = chart_service.suggest_chart_code(
            parent_id=request.query_params.get("parent"),
            account_type=request.query_params.get("account_type", ""),
            code_segment=request.query_params.get("code_segment", ""),
            name_ar=request.query_params.get("name_ar", ""),
        )
        return Response({"code": code})


class ChartGlAccountsLookupView(APIView):
    permission_classes = [HasPageAction]
    required_page = "chart-of-accounts"
    required_action = "view"

    def get(self, request):
        return Response(chart_service.list_gl_accounts_simple())


class CurrencyListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "currencies"
    required_action = "view"

    def get(self, request):
        return Response(currency_service.list_currencies())

    def post(self, request):
        self.required_action = "update"
        ser = CurrencyWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row = currency_service.create_currency(data=ser.validated_data)
        return Response(
            next((c for c in currency_service.list_currencies() if c["id"] == str(row.pk)), {}),
            status=status.HTTP_201_CREATED,
        )


class CurrencyDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "currencies"
    required_action = "update"

    def patch(self, request, pk):
        try:
            row = Currency.objects.using("tenant").get(pk=pk, is_active=True)
        except Currency.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        ser = CurrencyWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        currency_service.update_currency(row, data=ser.validated_data)
        return Response(
            next((c for c in currency_service.list_currencies() if c["id"] == str(pk)), {})
        )


class CurrencyConvertView(APIView):
    permission_classes = [HasPageAction]
    required_page = "currencies"
    required_action = "view"

    def post(self, request):
        ser = CurrencyConvertSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return Response(
            currency_service.convert_to_base(
                ser.validated_data["amount"],
                ser.validated_data["currency"],
            )
        )


class FixedAssetListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "asset-depreciation"
    required_action = "view"

    def get(self, request):
        return Response(
            {
                "assets": depreciation_service.list_fixed_assets(),
                "entries": depreciation_service.list_depreciation_entries(),
            }
        )

    def post(self, request):
        self.required_action = "update"
        ser = FixedAssetWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        asset = depreciation_service.create_fixed_asset(
            data=ser.validated_data, user=request.user
        )
        return Response(
            depreciation_service._serialize_asset(asset),
            status=status.HTTP_201_CREATED,
        )


class FixedAssetDepreciateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "asset-depreciation"
    required_action = "update"

    def post(self, request, pk):
        ser = DepreciationRunSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        entry = depreciation_service.run_depreciation(
            asset_id=pk, period=ser.validated_data["period"], user=request.user
        )
        return Response(
            {
                "entry": depreciation_service.list_depreciation_entries(asset_id=pk)[0],
                "asset": depreciation_service._serialize_asset(entry.asset),
            }
        )


class FixedAssetBulkDepreciateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "asset-depreciation"
    required_action = "approve"

    def post(self, request):
        if not (
            getattr(request.user, "is_owner", False)
            or can_perform_action(request.user, "asset-depreciation", "approve")
        ):
            return Response(
                {"detail": "ليس لديك صلاحية الإهلاك الجماعي."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = DepreciationRunSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return Response(
            depreciation_service.run_bulk_depreciation(
                period=ser.validated_data["period"], user=request.user
            )
        )
