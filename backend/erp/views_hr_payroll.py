"""API views — HR payroll & attendance."""

from datetime import date

from django.utils.connection import ConnectionDoesNotExist
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.hr_payroll_models import (
    AllowanceItem,
    BonusItem,
    DeductionItem,
    LeaveType,
    PayrollPaymentType,
)
from erp.permissions import HasPageAction
from erp.services import hr_payroll as payroll_service


def _catalog_list_create(model, prefix, page_key):
    class ListCreate(APIView):
        permission_classes = [HasPageAction]
        required_page = page_key
        required_action = "view"

        def get(self, request):
            try:
                payroll_service.ensure_payroll_seeded()
                return Response(payroll_service.list_catalog(model))
            except ConnectionDoesNotExist:
                return Response(
                    {"detail": "تعذر الاتصال بقاعدة بيانات المنشأة. أعد تسجيل الدخول أو حدّث الصفحة."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            except Exception as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        def post(self, request):
            self.required_action = "update"
            try:
                extra = {}
                if hasattr(model, "default_amount"):
                    extra["default_amount"] = request.data.get("default_amount")
                row = payroll_service.create_catalog(
                    model,
                    name=request.data.get("name", ""),
                    code=request.data.get("code") or None,
                    prefix=prefix,
                    **extra,
                )
                return Response(row, status=status.HTTP_201_CREATED)
            except ValidationError as exc:
                return Response({"detail": exc.detail}, status=status.HTTP_400_BAD_REQUEST)

    return ListCreate


def _catalog_detail(model, page_key):
    class Detail(APIView):
        permission_classes = [HasPageAction]
        required_page = page_key
        required_action = "update"

        def patch(self, request, pk):
            if not model.objects.using("tenant").filter(pk=pk, is_active=True).exists():
                return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
            extra = {}
            if hasattr(model, "default_amount") and "default_amount" in request.data:
                extra["default_amount"] = request.data.get("default_amount")
            return Response(
                payroll_service.update_catalog(
                    model,
                    pk,
                    name=request.data.get("name", ""),
                    **extra,
                )
            )

        def delete(self, request, pk):
            self.required_action = "delete"
            payroll_service.deactivate_catalog(model, pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

    return Detail


BonusItemListCreateView = _catalog_list_create(BonusItem, "BI", "bonus-items")
BonusItemDetailView = _catalog_detail(BonusItem, "bonus-items")
DeductionItemListCreateView = _catalog_list_create(DeductionItem, "DI", "deduction-items")
DeductionItemDetailView = _catalog_detail(DeductionItem, "deduction-items")
AllowanceItemListCreateView = _catalog_list_create(AllowanceItem, "AL", "allowance-items")
AllowanceItemDetailView = _catalog_detail(AllowanceItem, "allowance-items")
LeaveTypeListCreateView = _catalog_list_create(LeaveType, "LV", "leave-types")
LeaveTypeDetailView = _catalog_detail(LeaveType, "leave-types")
PaymentTypeListCreateView = _catalog_list_create(PayrollPaymentType, "PT", "payment-auth-types")
PaymentTypeDetailView = _catalog_detail(PayrollPaymentType, "payment-auth-types")


class OfficialHolidayListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "official-holidays"
    required_action = "view"

    def get(self, request):
        payroll_service.ensure_payroll_seeded()
        return Response(payroll_service.list_official_holidays())

    def post(self, request):
        self.required_action = "update"
        raw_date = request.data.get("holiday_date")
        row = payroll_service.create_official_holiday(
            name=request.data.get("name", ""),
            holiday_date=raw_date if raw_date else None,
            is_recurring=bool(request.data.get("is_recurring")),
            notes=request.data.get("notes") or "",
        )
        return Response(row, status=status.HTTP_201_CREATED)


class OfficialHolidayDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "official-holidays"
    required_action = "update"

    def patch(self, request, pk):
        return Response(payroll_service.update_official_holiday(pk, request.data))

    def delete(self, request, pk):
        self.required_action = "delete"
        payroll_service.deactivate_official_holiday(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BonusListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "bonuses"
    required_action = "view"

    def get(self, request):
        y, m = request.query_params.get("year"), request.query_params.get("month")
        return Response(
            payroll_service.list_bonuses(
                year=int(y) if y else None,
                month=int(m) if m else None,
            )
        )

    def post(self, request):
        self.required_action = "update"
        return Response(payroll_service.create_bonus(request.data), status=status.HTTP_201_CREATED)


class DeductionListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "deductions"
    required_action = "view"

    def get(self, request):
        y, m = request.query_params.get("year"), request.query_params.get("month")
        return Response(
            payroll_service.list_deductions(
                year=int(y) if y else None,
                month=int(m) if m else None,
            )
        )

    def post(self, request):
        self.required_action = "update"
        return Response(payroll_service.create_deduction(request.data), status=status.HTTP_201_CREATED)


class AllowanceAssignmentListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "allowances"
    required_action = "view"

    def get(self, request):
        payroll_service.ensure_payroll_seeded()
        return Response(payroll_service.list_allowance_assignments())

    def post(self, request):
        self.required_action = "update"
        return Response(
            payroll_service.upsert_allowance_assignment(request.data),
            status=status.HTTP_201_CREATED,
        )


class AllowanceAssignmentDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "allowances"
    required_action = "delete"

    def delete(self, request, pk):
        payroll_service.deactivate_allowance_assignment(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeLeaveListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "leaves"
    required_action = "view"

    def get(self, request):
        return Response(payroll_service.list_leaves())

    def post(self, request):
        self.required_action = "update"
        return Response(payroll_service.create_leave(request.data), status=status.HTTP_201_CREATED)


class AttendanceListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "attendance"
    required_action = "view"

    def get(self, request):
        return Response(
            payroll_service.list_attendance(
                from_date=request.query_params.get("from"),
                to_date=request.query_params.get("to"),
                employee_id=request.query_params.get("employee_id"),
            )
        )

    def post(self, request):
        self.required_action = "update"
        return Response(payroll_service.upsert_attendance(request.data), status=status.HTTP_201_CREATED)


class AttendanceDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "attendance"
    required_action = "update"

    def delete(self, request, pk):
        self.required_action = "delete"
        payroll_service.delete_attendance(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AttendanceImportView(APIView):
    permission_classes = [HasPageAction]
    required_page = "attendance-import"
    required_action = "update"

    def post(self, request):
        rows = request.data.get("rows") or []
        result = payroll_service.import_attendance_rows(
            request.user,
            rows,
            file_name=request.data.get("file_name") or "",
        )
        return Response(result, status=status.HTTP_201_CREATED)


class CommissionRecordListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "employee-commissions"
    required_action = "view"

    def get(self, request):
        y, m = request.query_params.get("year"), request.query_params.get("month")
        return Response(
            payroll_service.list_commission_records(
                year=int(y) if y else None,
                month=int(m) if m else None,
            )
        )

    def post(self, request):
        self.required_action = "update"
        return Response(
            payroll_service.create_commission_record(request.data),
            status=status.HTTP_201_CREATED,
        )


class EmployeeCommissionReportView(APIView):
    permission_classes = [HasPageAction]
    required_page = "employee-commissions"
    required_action = "view"

    def get(self, request):
        date_from = request.query_params.get("from") or None
        date_to = request.query_params.get("to") or None
        branch_id = request.query_params.get("branch_id") or None
        parsed_from = date.fromisoformat(date_from) if date_from else None
        parsed_to = date.fromisoformat(date_to) if date_to else None
        return Response(
            payroll_service.employee_commission_sales_report(
                date_from=parsed_from,
                date_to=parsed_to,
                branch_id=branch_id,
            )
        )


class PayrollSheetView(APIView):
    permission_classes = [HasPageAction]
    required_page = "payroll"
    required_action = "view"

    def get(self, request):
        year = int(request.query_params.get("year") or 0)
        month = int(request.query_params.get("month") or 0)
        branch_id = request.query_params.get("branch_id") or None
        if not year or not month:
            return Response({"detail": "year و month مطلوبان."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(payroll_service.get_payroll_sheet(year, month, branch_id=branch_id))


class PayrollStatementListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "payroll"
    required_action = "view"

    def get(self, request):
        return Response(
            payroll_service.list_payroll_statements(q=request.query_params.get("q") or "")
        )

    def post(self, request):
        self.required_action = "update"
        return Response(
            payroll_service.create_payroll_statement(request.user, request.data),
            status=status.HTTP_201_CREATED,
        )


class PayrollStatementDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "payroll"
    required_action = "view"

    def get(self, request, pk):
        return Response(payroll_service.get_payroll_statement(pk))

    def delete(self, request, pk):
        self.required_action = "delete"
        payroll_service.delete_payroll_statement(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PayrollPaymentListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "payroll-payments"
    required_action = "view"

    def get(self, request):
        y, m = request.query_params.get("year"), request.query_params.get("month")
        return Response(
            payroll_service.list_payroll_payments(
                year=int(y) if y else None,
                month=int(m) if m else None,
            )
        )

    def post(self, request):
        self.required_action = "update"
        return Response(
            payroll_service.create_payroll_payment(request.user, request.data),
            status=status.HTTP_201_CREATED,
        )


class EmployeeAdvanceListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "payroll-payments"
    required_action = "view"

    def get(self, request):
        return Response(payroll_service.list_advances())

    def post(self, request):
        self.required_action = "update"
        return Response(
            payroll_service.create_advance(request.user, request.data),
            status=status.HTTP_201_CREATED,
        )
