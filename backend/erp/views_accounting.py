from django.db.utils import OperationalError, ProgrammingError
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.accounting_models import GeneralExpenseType
from erp.permissions import HasPageAction
from erp.services import accounting as accounting_service

_MIGRATION_HINT = (
    "جدول بنود المصروفات غير موجود على قاعدة بيانات المتجر. "
    "شغّل ترحيلات Django: python manage.py migrate"
)


class ExpenseTypeListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "expense-types"
    required_action = "view"

    def get(self, request):
        if not accounting_service.expense_types_tables_ready():
            return Response(
                {"detail": _MIGRATION_HINT, "code": "expense_types_not_migrated"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        try:
            accounting_service.ensure_default_expense_types()
            return Response(accounting_service.list_expense_types_flat())
        except (ProgrammingError, OperationalError):
            return Response(
                {"detail": _MIGRATION_HINT, "code": "expense_types_not_migrated"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            return Response(
                {"detail": f"تعذر تحميل بنود المصروفات: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        self.required_action = "update"
        if not accounting_service.expense_types_tables_ready():
            return Response(
                {"detail": _MIGRATION_HINT, "code": "expense_types_not_migrated"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        try:
            item = accounting_service.create_expense_type(data=request.data)
            rows = accounting_service.list_expense_types_flat()
            row = next((r for r in rows if r["id"] == str(item.pk)), None)
            return Response(row or {"id": str(item.pk)}, status=status.HTTP_201_CREATED)
        except ValidationError as exc:
            detail = exc.detail if hasattr(exc, "detail") else str(exc)
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)
        except (ProgrammingError, OperationalError):
            return Response(
                {"detail": _MIGRATION_HINT, "code": "expense_types_not_migrated"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            return Response(
                {"detail": f"تعذر حفظ البند: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ExpenseTypeDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "expense-types"
    required_action = "update"

    def patch(self, request, pk):
        try:
            item = GeneralExpenseType.objects.using("tenant").get(pk=pk, is_active=True)
        except GeneralExpenseType.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        accounting_service.update_expense_type(item, data=request.data)
        rows = accounting_service.list_expense_types_flat()
        row = next((r for r in rows if r["id"] == str(pk)), None)
        return Response(row or {"id": str(pk)})

    def delete(self, request, pk):
        try:
            item = GeneralExpenseType.objects.using("tenant").get(pk=pk, is_active=True)
        except GeneralExpenseType.DoesNotExist:
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        accounting_service.soft_delete_expense_type(item)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExpenseTypeNextCodeView(APIView):
    permission_classes = [HasPageAction]
    required_page = "expense-types"
    required_action = "view"

    def get(self, request):
        parent = request.query_params.get("parent")
        segment = request.query_params.get("code_segment", "")
        name_ar = request.query_params.get("name_ar", "")
        code = accounting_service.suggest_expense_type_code(
            parent_id=parent,
            code_segment=segment,
            name_ar=name_ar,
        )
        return Response({"code": code})


class GlAccountListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "expense-types"
    required_action = "view"

    def get(self, request):
        from erp.services.accounting_chart import list_gl_accounts_simple

        return Response(list_gl_accounts_simple())


class CostCenterListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "expense-types"
    required_action = "view"

    def get(self, request):
        return Response(accounting_service.list_cost_centers())
