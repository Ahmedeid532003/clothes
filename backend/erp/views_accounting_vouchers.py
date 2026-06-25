from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.permissions import HasPageAction, can_perform_action, can_use_feature, can_access_page
from erp.serializers_accounting_vouchers import (
    CashShiftCloseSerializer,
    CashShiftOpenSerializer,
    CashShiftReceiveSerializer,
    ExpenseVoucherWriteSerializer,
)
from erp.services import accounting_vouchers as voucher_service


def _parse_voucher_form(request):
    data = request.data.copy()
    if hasattr(data, "dict"):
        data = data.dict()
    files = request.FILES.getlist("attachments") if request.FILES else None
    return data, files


class TreasuryListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "expense-vouchers"
    required_action = "view"

    def get(self, request):
        return Response(voucher_service.list_treasuries())


class ExpenseVoucherListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "expense-vouchers"
    required_action = "view"

    def get(self, request):
        st = request.query_params.get("status")
        try:
            voucher_service.ensure_default_treasuries()
            return Response(voucher_service.list_expense_vouchers(status=st))
        except Exception as exc:
            return Response(
                {"detail": f"تعذر تحميل المصروفات: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        self.required_action = "update"
        data, files = _parse_voucher_form(request)
        ser = ExpenseVoucherWriteSerializer(data=data)
        ser.is_valid(raise_exception=True)
        voucher = voucher_service.create_expense_voucher(
            data=ser.validated_data, user=request.user, files=files
        )
        if request.data.get("approve"):
            voucher = voucher_service.approve_expense_voucher(voucher.pk, request.user)
        if request.data.get("post"):
            voucher = voucher_service.post_expense_voucher(voucher.pk, request.user)
        rows = voucher_service.list_expense_vouchers()
        row = next((r for r in rows if r["id"] == str(voucher.pk)), None)
        return Response(row or {"id": str(voucher.pk)}, status=status.HTTP_201_CREATED)


class ExpenseVoucherDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "expense-vouchers"
    required_action = "update"

    def patch(self, request, pk):
        data, files = _parse_voucher_form(request)
        ser = ExpenseVoucherWriteSerializer(data=data, partial=True)
        ser.is_valid(raise_exception=True)
        voucher = voucher_service.update_expense_voucher(
            pk, data=ser.validated_data, user=request.user, files=files
        )
        rows = voucher_service.list_expense_vouchers()
        row = next((r for r in rows if r["id"] == str(pk)), None)
        return Response(row or {"id": str(pk)})


class ExpenseVoucherActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "expense-vouchers"
    required_action = "update"

    def post(self, request, pk, action):
        try:
            if action in ("approve", "post"):
                if not (
                    getattr(request.user, "is_owner", False)
                    or can_perform_action(request.user, "expense-vouchers", "approve")
                ):
                    return Response(
                        {"detail": "ليس لديك صلاحية اعتماد أو ترحيل الأذونات."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            if action == "approve":
                voucher = voucher_service.approve_expense_voucher(pk, request.user)
            elif action == "post":
                voucher = voucher_service.post_expense_voucher(pk, request.user)
            elif action == "cancel":
                voucher = voucher_service.cancel_expense_voucher(pk)
            else:
                return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError:
            raise
        rows = voucher_service.list_expense_vouchers()
        row = next((r for r in rows if r["id"] == str(voucher.pk)), None)
        return Response(row or {"id": str(pk)})


class CashShiftListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cash-shifts"
    required_action = "view"

    def get(self, request):
        st = request.query_params.get("status")
        return Response(
            voucher_service.list_cash_shifts(
                status=st,
                branch_id=request.query_params.get("branch"),
                employee_id=request.query_params.get("employee"),
                handover_status=request.query_params.get("handover_status"),
                q=request.query_params.get("q"),
            )
        )


class CashShiftMyOpenView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cash-shifts"
    required_action = "view"

    def get(self, request):
        row = voucher_service.get_my_open_shift(request.user)
        return Response(row or None)


class CashShiftActiveUsersView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cash-shifts"
    required_action = "view"

    def get(self, request):
        return Response(voucher_service.list_active_shift_users())


class CashShiftPosGateView(APIView):
    """هل يلزم وردية مفتوحة لنقطة البيع + وردية المستخدم الحالية."""

    permission_classes = [HasPageAction]
    required_page = "pos"
    required_action = "view"

    def get(self, request):
        row = voucher_service.get_my_open_shift(request.user)
        return Response(
            {
                "required": voucher_service.pos_requires_open_shift(),
                "open_shift": row,
            }
        )


class CashShiftOpenView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cash-shifts"
    required_action = "update"

    def post(self, request):
        ser = CashShiftOpenSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        shift = voucher_service.open_cash_shift(data=ser.validated_data, user=request.user)
        return Response(
            voucher_service.get_cash_shift(shift.pk, sync_sales=False),
            status=status.HTTP_201_CREATED,
        )


class CashShiftDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cash-shifts"
    required_action = "view"

    def get(self, request, pk):
        return Response(voucher_service.get_cash_shift(pk))


class CashShiftDailyReportView(APIView):
    """تقرير اليومية كاشير — متاح لمن يملك صلاحية عرض الورديات."""

    permission_classes = [HasPageAction]
    required_page = "cash-shifts"
    required_action = "view"

    def get(self, request, pk):
        return Response(voucher_service.get_shift_daily_report(pk))


class EnterpriseCashDashboardView(APIView):
    permission_classes = [HasPageAction]
    required_page = "enterprise-cash-balances"
    required_action = "view"

    def get(self, request):
        return Response(voucher_service.get_enterprise_cash_dashboard())


class CashShiftActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cash-shifts"
    required_action = "update"

    def check_permissions(self, request):
        action = self.kwargs.get("action")
        user = request.user
        if action == "receive":
            if not user or not user.is_authenticated:
                self.permission_denied(request)
            if getattr(user, "is_owner", False):
                return
            if not can_access_page(user, "cash-shifts"):
                self.permission_denied(request)
            if not can_use_feature(user, "cash-shifts", "receive_treasury"):
                self.permission_denied(request, message="ليس لديك صلاحية استلام مبلغ الوردية للخزينة.")
            return
        if action == "approve":
            if not user or not user.is_authenticated:
                self.permission_denied(request)
            if getattr(user, "is_owner", False):
                return
            if not can_access_page(user, "cash-shifts"):
                self.permission_denied(request)
            if not can_perform_action(user, "cash-shifts", "approve"):
                self.permission_denied(request, message="ليس لديك صلاحية اعتماد الورديات.")
            return
        super().check_permissions(request)

    def post(self, request, pk, action):
        try:
            if action == "close":
                ser = CashShiftCloseSerializer(data=request.data)
                ser.is_valid(raise_exception=True)
                shift = voucher_service.close_cash_shift(
                    pk, data=ser.validated_data, user=request.user
                )
            elif action == "approve":
                if not (
                    getattr(request.user, "is_owner", False)
                    or can_perform_action(request.user, "cash-shifts", "approve")
                ):
                    return Response(
                        {"detail": "ليس لديك صلاحية اعتماد الورديات."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                shift = voucher_service.approve_cash_shift(pk, request.user)
            elif action == "receive":
                ser = CashShiftReceiveSerializer(data=request.data)
                ser.is_valid(raise_exception=True)
                shift = voucher_service.receive_shift_cash(
                    pk, data=ser.validated_data, user=request.user
                )
            else:
                return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError:
            raise
        return Response(voucher_service.get_cash_shift(shift.pk))
