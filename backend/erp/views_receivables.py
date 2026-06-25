"""واجهات ذمم العملاء — لوحة CRM، تأخيرات، أقساط."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.permissions import HasAnyCustomerModulePage, HasPageAction
from erp.receivable_models import ReceivableInvoice
from erp.services import receivables as receivable_service


class CustomerCrmDashboardView(APIView):
    permission_classes = [HasAnyCustomerModulePage]
    customer_pages = ("customer-dashboard", "customers", "customer-arrears")

    def get(self, request):
        if ReceivableInvoice.objects.using("tenant").count() == 0:
            receivable_service.seed_receivables_demo()
        return Response(receivable_service.crm_dashboard())


class CustomerArrearsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-arrears"
    required_action = "view"

    def get(self, request):
        if ReceivableInvoice.objects.using("tenant").count() == 0:
            receivable_service.seed_receivables_demo()
        return Response(
            receivable_service.arrears_report(
                salesperson_id=request.query_params.get("salesperson"),
                bucket=request.query_params.get("bucket"),
            )
        )


class CustomerAccountStatementView(APIView):
    """كشف حساب عميل — تفصيلي وحساب عام."""

    permission_classes = [HasPageAction]
    required_page = "customer-accounts"
    required_action = "view"

    def get(self, request):
        from erp.services.customer_statement import customer_account_statement

        qp = request.query_params
        view = qp.get("view") or "detailed"
        if view not in ("detailed", "general"):
            view = "detailed"
        return Response(
            customer_account_statement(
                customer_id=qp.get("customer"),
                date_from=qp.get("from") or None,
                date_to=qp.get("to") or None,
                view=view,
                limit=int(qp.get("limit", 500)),
            )
        )


class CustomerFollowUpView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-dashboard"
    required_action = "update"

    def post(self, request):
        return Response(
            receivable_service.schedule_follow_up(request.data, request.user),
            status=status.HTTP_201_CREATED,
        )


class CustomerReminderView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-arrears"
    required_action = "update"

    def post(self, request):
        return Response(
            receivable_service.queue_reminder(request.data, request.user),
            status=status.HTTP_201_CREATED,
        )


class CustomerAutoRemindersView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-arrears"
    required_action = "update"

    def post(self, request):
        return Response(receivable_service.run_auto_reminder_engine())


class InstallmentPlanListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-installments"
    required_action = "view"

    def get(self, request):
        if ReceivableInvoice.objects.using("tenant").count() == 0:
            receivable_service.seed_receivables_demo()
        active_only = request.query_params.get("active") in ("1", "true", "yes")
        return Response(receivable_service.list_installment_plans(active_only=active_only))

    def post(self, request):
        self.required_action = "update"
        return Response(
            receivable_service.create_installment_plan(request.data),
            status=status.HTTP_201_CREATED,
        )


class InstallmentPlanDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-installments"
    required_action = "view"

    def get(self, request, pk):
        return Response(receivable_service.get_installment_plan(pk))

    def patch(self, request, pk):
        self.required_action = "update"
        return Response(receivable_service.update_installment_plan(pk, request.data))


class InstallmentPlanPreviewView(APIView):
    permission_classes = [HasPageAction]
    required_page = "pos"
    required_action = "view"

    def get(self, request):
        from decimal import Decimal

        plan_id = request.query_params.get("plan")
        principal = request.query_params.get("principal")
        if not plan_id or principal is None:
            return Response({"detail": "plan و principal مطلوبان"}, status=400)
        down = request.query_params.get("down_payment")
        num = request.query_params.get("num_installments")
        return Response(
            receivable_service.preview_installment_plan(
                plan_id=plan_id,
                principal=Decimal(str(principal)),
                down_payment_amount=Decimal(str(down)) if down is not None else None,
                num_installments=int(num) if num else None,
            )
        )


class InstallmentContractListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-installments"
    required_action = "view"

    def get(self, request):
        return Response(
            receivable_service.list_installment_contracts(
                customer_id=request.query_params.get("customer")
            )
        )

    def post(self, request):
        self.required_action = "update"
        return Response(
            receivable_service.create_installment_contract(request.data, request.user),
            status=status.HTTP_201_CREATED,
        )


class InstallmentContractDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-installments"
    required_action = "view"

    def get(self, request, pk):
        return Response(receivable_service.get_installment_contract(pk))

    def patch(self, request, pk):
        self.required_action = "update"
        action = request.data.get("action")
        if action == "submit_approval":
            return Response(receivable_service.submit_contract_for_approval(pk, request.user))
        if action == "approve":
            return Response(receivable_service.approve_contract(pk, request.user))
        if action == "recalculate":
            return Response(receivable_service.recalculate_contract(pk))
        if action == "reschedule":
            from datetime import date

            start = request.data.get("start_date")
            if not start:
                return Response({"detail": "start_date مطلوب"}, status=400)
            return Response(
                receivable_service.reschedule_contract(pk, date.fromisoformat(start), request.user)
            )
        if action == "restructure":
            lines = request.data.get("lines") or []
            return Response(
                receivable_service.restructure_installment_contract(
                    pk,
                    lines,
                    request.data.get("expected_total"),
                    request.user,
                )
            )
        return Response({"detail": "إجراء غير معروف"}, status=400)


class InstallmentLineActionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-installments"
    required_action = "update"

    def patch(self, request, pk):
        action = request.data.get("action")
        if action == "defer":
            from datetime import date

            d = request.data.get("deferred_to")
            if not d:
                return Response({"detail": "deferred_to مطلوب"}, status=400)
            return Response(
                receivable_service.defer_installment_line(pk, date.fromisoformat(d), request.user)
            )
        if action == "modify_amount":
            from decimal import Decimal

            amt = request.data.get("amount")
            if amt is None:
                return Response({"detail": "amount مطلوب"}, status=400)
            return Response(
                receivable_service.modify_installment_amount(pk, Decimal(str(amt)), request.user)
            )
        if action == "split":
            parts = int(request.data.get("parts", 2))
            return Response(receivable_service.split_installment_line(pk, parts, request.user))
        return Response({"detail": "إجراء غير معروف"}, status=400)


class InstallmentMergeView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-installments"
    required_action = "update"

    def post(self, request):
        ids = request.data.get("line_ids") or []
        return Response(receivable_service.merge_installment_lines(ids, request.user))


class InstallmentReportsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "customer-installments"
    required_action = "view"

    def get(self, request):
        return Response(receivable_service.installment_reports())


class InstallmentCollectionView(APIView):
    permission_classes = [HasPageAction]
    required_page = "installment-collection"
    required_action = "view"

    def get(self, request):
        include_paid = request.query_params.get("include_paid") in ("1", "true", "yes")
        return Response(
            receivable_service.installment_collection_overview(
                customer_id=request.query_params.get("customer"),
                include_paid=include_paid,
            )
        )

    def post(self, request):
        self.required_action = "update"
        return Response(
            receivable_service.collect_installment_payment(
                customer_id=request.data.get("customer"),
                amount=request.data.get("amount"),
                method=request.data.get("method", "cash"),
                reference=request.data.get("reference", ""),
                user=request.user,
            ),
            status=status.HTTP_201_CREATED,
        )


class InstallmentFollowUpOptionsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "installment-follow-up"
    required_action = "view"

    def get(self, request):
        from erp.services.installment_followup import followup_filter_options

        return Response(followup_filter_options())


class InstallmentFollowUpListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "installment-follow-up"
    required_action = "view"

    def get(self, request):
        from erp.services.installment_followup import list_installment_followup

        return Response(list_installment_followup(params=request.query_params))


class InstallmentFollowUpBulkUpdateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "installment-follow-up"
    required_action = "update"

    def post(self, request):
        from erp.services.installment_followup import bulk_update_followup_customers

        return Response(
            bulk_update_followup_customers(
                customer_ids=request.data.get("customer_ids") or [],
                patch=request.data.get("patch") or {},
                user=request.user,
            )
        )


class InstallmentFollowUpListNumberView(APIView):
    permission_classes = [HasPageAction]
    required_page = "installment-follow-up"
    required_action = "update"

    def post(self, request):
        from erp.services.installment_followup import assign_list_number

        return Response(
            assign_list_number(
                customer_ids=request.data.get("customer_ids") or [],
                list_number=request.data.get("list_number") or "",
                filters=request.data.get("filters"),
                user=request.user,
            )
        )


class InstallmentFollowUpSavedListsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "installment-follow-up"
    required_action = "view"

    def get(self, request):
        from erp.services.installment_followup import list_saved_followup_lists

        return Response(list_saved_followup_lists())


class InstallmentFollowUpPenaltiesView(APIView):
    permission_classes = [HasPageAction]
    required_page = "installment-follow-up"
    required_action = "update"

    def post(self, request):
        from decimal import Decimal

        from erp.services.installment_followup import apply_late_penalties

        return Response(
            apply_late_penalties(
                customer_ids=request.data.get("customer_ids") or [],
                penalty_type=request.data.get("penalty_type") or "fixed",
                penalty_value=Decimal(str(request.data.get("penalty_value") or 0)),
                user=request.user,
            )
        )


class InstallmentFollowUpRemindersView(APIView):
    permission_classes = [HasPageAction]
    required_page = "installment-follow-up"
    required_action = "update"

    def post(self, request):
        from erp.services.installment_followup import bulk_queue_reminders

        result = bulk_queue_reminders(
            customer_ids=request.data.get("customer_ids") or [],
            channel=request.data.get("channel") or "whatsapp",
            message=request.data.get("message") or "",
            user=request.user,
        )
        return Response(result, status=status.HTTP_201_CREATED)
