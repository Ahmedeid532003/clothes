from datetime import date

from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.permissions import HasPageAction, can_perform_action
from erp.serializers_accounting_reports import (
    GeneralLedgerQuerySerializer,
    JournalEntryWriteSerializer,
    ReportDateSerializer,
)
from erp.services import accounting_journal as journal_service
from erp.services import accounting_reports as report_service


def _parse_report_params(data: dict) -> dict:
    params = {}
    if data.get("as_of"):
        params["as_of"] = data["as_of"]
    if data.get("from_date"):
        params["from_date"] = data["from_date"]
    if data.get("to_date"):
        params["to_date"] = data["to_date"]
    if data.get("branch"):
        params["branch_id"] = data["branch"]
    return params


class JournalEntryListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "journal-entries"
    required_action = "view"

    def get(self, request):
        st = request.query_params.get("status")
        fd = request.query_params.get("from_date")
        td = request.query_params.get("to_date")
        return Response(
            journal_service.list_journal_entries(
                status=st,
                from_date=fd or None,
                to_date=td or None,
            )
        )

    def post(self, request):
        self.required_action = "update"
        ser = JournalEntryWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        entry = journal_service.create_journal_entry(
            data=ser.validated_data, user=request.user
        )
        if request.data.get("approve"):
            entry = journal_service.approve_journal_entry(entry.pk, request.user)
        if request.data.get("post"):
            entry = journal_service.post_journal_entry(entry.pk, request.user)
        return Response(
            journal_service.get_journal_entry(entry.pk),
            status=status.HTTP_201_CREATED,
        )


class JournalEntryDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "journal-entries"
    required_action = "view"

    def get(self, request, pk):
        return Response(journal_service.get_journal_entry(pk))

    def patch(self, request, pk):
        self.required_action = "update"
        ser = JournalEntryWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        journal_service.update_journal_entry(pk, data=ser.validated_data, user=request.user)
        return Response(journal_service.get_journal_entry(pk))

    def delete(self, request, pk):
        self.required_action = "delete"
        journal_service.delete_journal_entry(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class JournalEntryActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "journal-entries"
    required_action = "update"

    def post(self, request, pk, action):
        if action in ("approve", "post"):
            if not (
                getattr(request.user, "is_owner", False)
                or can_perform_action(request.user, "journal-entries", "approve")
            ):
                return Response(
                    {"detail": "ليس لديك صلاحية اعتماد أو ترحيل القيود."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        if action == "approve":
            journal_service.approve_journal_entry(pk, request.user)
        elif action == "post":
            journal_service.post_journal_entry(pk, request.user)
        elif action == "void":
            journal_service.void_journal_entry(pk, request.user)
        else:
            return Response({"detail": "إجراء غير معروف."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(journal_service.get_journal_entry(pk))


class TrialBalanceView(APIView):
    permission_classes = [HasPageAction]
    required_page = "trial-balance"
    required_action = "view"

    def get(self, request):
        ser = ReportDateSerializer(data=request.query_params)
        ser.is_valid(raise_exception=True)
        params = _parse_report_params(ser.validated_data)
        if not params.get("as_of") and not params.get("to_date"):
            params["as_of"] = date.today()
        return Response(report_service.trial_balance(**params))


class BalanceSheetView(APIView):
    permission_classes = [HasPageAction]
    required_page = "balance-sheet"
    required_action = "view"

    def get(self, request):
        ser = ReportDateSerializer(data=request.query_params)
        ser.is_valid(raise_exception=True)
        params = _parse_report_params(ser.validated_data)
        as_of = params.get("as_of") or params.get("to_date") or date.today()
        return Response(
            report_service.balance_sheet(as_of=as_of, branch_id=params.get("branch_id"))
        )


class IncomeStatementView(APIView):
    permission_classes = [HasPageAction]
    required_page = "income-statement"
    required_action = "view"

    def get(self, request):
        ser = ReportDateSerializer(data=request.query_params)
        ser.is_valid(raise_exception=True)
        params = _parse_report_params(ser.validated_data)
        fd = params.get("from_date") or date.today().replace(month=1, day=1)
        td = params.get("to_date") or date.today()
        return Response(
            report_service.income_statement(
                from_date=fd,
                to_date=td,
                branch_id=params.get("branch_id"),
            )
        )


class GeneralLedgerView(APIView):
    permission_classes = [HasPageAction]
    required_page = "general-ledger"
    required_action = "view"

    def get(self, request):
        ser = GeneralLedgerQuerySerializer(data=request.query_params)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        return Response(
            report_service.general_ledger(
                account_id=d["account"],
                from_date=d["from_date"],
                to_date=d["to_date"],
                branch_id=d.get("branch"),
            )
        )


class ReportExportView(APIView):
    permission_classes = [HasPageAction]
    required_page = "trial-balance"
    required_action = "view"

    def get(self, request):
        report_type = request.query_params.get("type", "trial_balance")
        ser = ReportDateSerializer(data=request.query_params)
        ser.is_valid(raise_exception=True)
        params = _parse_report_params(ser.validated_data)
        if report_type == "general_ledger":
            acc = request.query_params.get("account")
            if not acc:
                return Response({"detail": "account مطلوب"}, status=400)
            params["account_id"] = acc
            params["from_date"] = params.get("from_date") or date.today().replace(month=1, day=1)
            params["to_date"] = params.get("to_date") or date.today()
        elif report_type == "income_statement":
            params["from_date"] = params.get("from_date") or date.today().replace(month=1, day=1)
            params["to_date"] = params.get("to_date") or date.today()
        else:
            params["as_of"] = params.get("as_of") or date.today()

        csv_body = report_service.export_report_csv(
            report_type.replace("-", "_"), params
        )
        resp = HttpResponse(csv_body, content_type="text/csv; charset=utf-8-sig")
        resp["Content-Disposition"] = f'attachment; filename="{report_type}.csv"'
        return resp
