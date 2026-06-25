from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.permissions import HasPageAction, can_perform_action
from erp.serializers_accounting_extended import (
    ShiftHandoverCreateSerializer,
    ShiftHandoverReceiveSerializer,
    TreasuryMovementWriteSerializer,
)
from erp.services import accounting_handovers as handover_service
from erp.services import accounting_pending as pending_service
from erp.services import accounting_treasury as treasury_service
from erp.services import accounting_vouchers as voucher_service


class ShiftHandoverListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "shift-handovers"
    required_action = "view"

    def get(self, request):
        st = request.query_params.get("status")
        return Response(handover_service.list_handovers(status=st))

    def post(self, request):
        self.required_action = "update"
        ser = ShiftHandoverCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        h = handover_service.create_handover(data=ser.validated_data, user=request.user)
        return Response(handover_service.get_handover(h.pk), status=status.HTTP_201_CREATED)


class ShiftHandoverDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "shift-handovers"
    required_action = "view"

    def get(self, request, pk):
        return Response(handover_service.get_handover(pk))


class ShiftHandoverActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "shift-handovers"
    required_action = "update"

    def post(self, request, pk, action):
        try:
            if action == "sign-sender":
                h = handover_service.sign_sender(pk, request.user)
            elif action == "receive":
                ser = ShiftHandoverReceiveSerializer(data=request.data)
                ser.is_valid(raise_exception=True)
                h = handover_service.receive_handover(
                    pk, data=ser.validated_data, user=request.user
                )
            elif action == "approve":
                if not (
                    getattr(request.user, "is_owner", False)
                    or can_perform_action(request.user, "shift-handovers", "approve")
                ):
                    return Response(
                        {"detail": "ليس لديك صلاحية اعتماد التسليم."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                h = handover_service.approve_handover(pk, request.user)
            elif action == "complete":
                h = handover_service.complete_handover(pk, request.user)
            else:
                return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError:
            raise
        return Response(handover_service.get_handover(h.pk))


class TreasuryBalanceListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "treasury-movements"
    required_action = "view"

    def get(self, request):
        return Response(treasury_service.list_treasury_balances())


class TreasuryMovementListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "treasury-movements"
    required_action = "view"

    def get(self, request):
        st = request.query_params.get("status")
        tid = request.query_params.get("treasury")
        return Response(
            treasury_service.list_treasury_movements(status=st, treasury_id=tid)
        )

    def post(self, request):
        self.required_action = "update"
        ser = TreasuryMovementWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        m = treasury_service.create_treasury_movement(
            data=ser.validated_data, user=request.user
        )
        rows = treasury_service.list_treasury_movements()
        row = next((r for r in rows if r["id"] == str(m.pk)), None)
        return Response(row or {"id": str(m.pk)}, status=status.HTTP_201_CREATED)


class TreasuryMovementActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "treasury-movements"
    required_action = "update"

    def post(self, request, pk, action):
        try:
            if action == "post":
                if not (
                    getattr(request.user, "is_owner", False)
                    or can_perform_action(request.user, "treasury-movements", "approve")
                ):
                    return Response(
                        {"detail": "ليس لديك صلاحية ترحيل الحركات."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                m = treasury_service.post_treasury_movement(pk, request.user)
            elif action == "cancel":
                m = treasury_service.cancel_treasury_movement(pk, request.user)
            else:
                return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError:
            raise
        rows = treasury_service.list_treasury_movements()
        row = next((r for r in rows if r["id"] == str(m.pk)), None)
        return Response(row or {"id": str(pk)})


class TreasuryAuditLogView(APIView):
    permission_classes = [HasPageAction]
    required_page = "treasury-movements"
    required_action = "view"

    def get(self, request):
        return Response(treasury_service.list_audit_logs())


class PendingShiftsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "pending-shifts"
    required_action = "view"

    def get(self, request):
        return Response(pending_service.list_pending_shifts())


class PendingShiftActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "pending-shifts"
    required_action = "approve"

    def post(self, request, pk, action):
        if action != "force-approve":
            return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        if not (
            getattr(request.user, "is_owner", False)
            or can_perform_action(request.user, "pending-shifts", "approve")
        ):
            return Response(
                {"detail": "ليس لديك صلاحية الاعتماد اليدوي."},
                status=status.HTTP_403_FORBIDDEN,
            )
        shift = pending_service.force_approve_shift(pk, request.user)
        return Response(voucher_service.get_cash_shift(shift.pk))
