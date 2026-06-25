"""واجهات البنوك وحسابات البنوك والشيكات."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.banking_models import Bank, BankAccount, Cheque
from erp.permissions import HasPageAction
from erp.services import banking as banking_service
from erp.services import banking_channels as channels_service


class BankListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "banks"
    required_action = "view"

    def get(self, request):
        return Response(banking_service.list_banks())

    def post(self, request):
        self.required_action = "update"
        item = banking_service.create_bank(data=request.data)
        return Response(banking_service._serialize_bank(item), status=status.HTTP_201_CREATED)


class BankDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "banks"
    required_action = "update"

    def patch(self, request, pk):
        item = banking_service.update_bank(pk, data=request.data)
        return Response(banking_service._serialize_bank(item))

    def delete(self, request, pk):
        banking_service.delete_bank(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BankAccountListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "bank-accounts"
    required_action = "view"

    def get(self, request):
        bank_id = request.query_params.get("bank")
        return Response(banking_service.list_bank_accounts(bank_id=bank_id))

    def post(self, request):
        self.required_action = "update"
        item = banking_service.create_bank_account(data=request.data)
        return Response(
            banking_service._serialize_account(item),
            status=status.HTTP_201_CREATED,
        )


class BankAccountDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "bank-accounts"
    required_action = "update"

    def get(self, request, pk):
        item = (
            BankAccount.objects.using("tenant")
            .select_related("bank")
            .get(pk=pk, is_active=True)
        )
        return Response(banking_service._serialize_account(item))

    def patch(self, request, pk):
        item = banking_service.update_bank_account(pk, data=request.data)
        return Response(banking_service._serialize_account(item))

    def delete(self, request, pk):
        banking_service.delete_bank_account(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BankAccountMovementListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "bank-accounts"
    required_action = "view"

    def get(self, request):
        account_id = request.query_params.get("bank_account")
        return Response(banking_service.list_account_movements(account_id=account_id))

    def post(self, request):
        self.required_action = "update"
        post = request.data.get("post") in (True, "true", "1", 1)
        movement = banking_service.create_account_movement(
            data=request.data, user=request.user, post=post
        )
        return Response(
            banking_service._serialize_movement(movement),
            status=status.HTTP_201_CREATED,
        )


class BankAccountMovementPostView(APIView):
    permission_classes = [HasPageAction]
    required_page = "bank-accounts"
    required_action = "update"

    def post(self, request, pk):
        movement = banking_service.post_account_movement(pk, request.user)
        return Response(banking_service._serialize_movement(movement))


class ChequeListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cheques"
    required_action = "view"

    def get(self, request):
        return Response(
            banking_service.list_cheques(
                status=request.query_params.get("status"),
                direction=request.query_params.get("direction"),
                paper_type=request.query_params.get("paper_type"),
                source=request.query_params.get("source"),
            )
        )

    def post(self, request):
        self.required_action = "update"
        cheque = banking_service.create_cheque(data=request.data, user=request.user)
        return Response(
            banking_service._serialize_cheque(cheque),
            status=status.HTTP_201_CREATED,
        )


class ChequeDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cheques"
    required_action = "update"

    def patch(self, request, pk):
        cheque = banking_service.update_cheque(pk, data=request.data)
        return Response(banking_service._serialize_cheque(cheque))

    def delete(self, request, pk):
        banking_service.delete_cheque(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChequePayView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cheques"
    required_action = "update"

    def post(self, request, pk):
        cheque = banking_service.pay_cheque(pk, request.user, data=request.data)
        return Response(banking_service._serialize_cheque(cheque))


class ChequeDeliverView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cheques"
    required_action = "update"

    def post(self, request, pk):
        cheque = banking_service.deliver_cheque(
            pk,
            delivery_date=request.data.get("delivery_date"),
        )
        return Response(banking_service._serialize_cheque(cheque))


class ChequeCancelView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cheques"
    required_action = "update"

    def post(self, request, pk):
        cheque = banking_service.cancel_cheque(pk)
        return Response(banking_service._serialize_cheque(cheque))


class ChequeReturnView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cheques"
    required_action = "update"

    def post(self, request, pk):
        cheque = banking_service.return_cheque(pk)
        return Response(banking_service._serialize_cheque(cheque))


class ChequeRejectView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cheques"
    required_action = "update"

    def post(self, request, pk):
        cheque = banking_service.reject_cheque(pk)
        return Response(banking_service._serialize_cheque(cheque))


class ChequeAlertsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "cheques"
    required_action = "view"

    def get(self, request):
        days = int(request.query_params.get("days", 2))
        return Response(banking_service.cheque_alerts(days=days))


class PaymentMethodsDashboardView(APIView):
    permission_classes = [HasPageAction]
    required_page = "payment-methods-dashboard"
    required_action = "view"

    def get(self, request):
        return Response(
            channels_service.payment_methods_dashboard(
                date_from=request.query_params.get("from"),
                date_to=request.query_params.get("to"),
            )
        )


# ——— Cards (Visa) ———


class CardNetworkListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "card-transactions"
    required_action = "view"

    def get(self, request):
        return Response(channels_service.list_card_networks())

    def post(self, request):
        self.required_action = "update"
        item = channels_service.create_card_network(data=request.data)
        return Response(
            channels_service._serialize_card_network(item),
            status=status.HTTP_201_CREATED,
        )


class CardNetworkDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "card-transactions"
    required_action = "update"

    def patch(self, request, pk):
        item = channels_service.update_card_network(pk, data=request.data)
        return Response(channels_service._serialize_card_network(item))

    def delete(self, request, pk):
        channels_service.delete_card_network(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CardAccountListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "card-transactions"
    required_action = "view"

    def get(self, request):
        return Response(
            channels_service.list_card_accounts(
                network_id=request.query_params.get("network")
            )
        )

    def post(self, request):
        self.required_action = "update"
        item = channels_service.create_card_account(data=request.data)
        return Response(
            channels_service._serialize_card_account(item),
            status=status.HTTP_201_CREATED,
        )


class CardAccountDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "card-transactions"
    required_action = "update"

    def patch(self, request, pk):
        item = channels_service.update_card_account(pk, data=request.data)
        return Response(channels_service._serialize_card_account(item))

    def delete(self, request, pk):
        channels_service.delete_card_account(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CardTransactionListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "card-transactions"
    required_action = "view"

    def get(self, request):
        return Response(
            channels_service.list_card_transactions(
                status=request.query_params.get("status"),
                account_id=request.query_params.get("card_account"),
            )
        )

    def post(self, request):
        self.required_action = "update"
        tx = channels_service.create_card_transaction(data=request.data, user=request.user)
        return Response(
            channels_service._serialize_card_tx(tx),
            status=status.HTTP_201_CREATED,
        )


class CardTransactionSettleView(APIView):
    permission_classes = [HasPageAction]
    required_page = "card-transactions"
    required_action = "update"

    def post(self, request, pk):
        tx = channels_service.settle_card_transaction(pk, request.user)
        return Response(channels_service._serialize_card_tx(tx))


class CardTransactionRejectView(APIView):
    permission_classes = [HasPageAction]
    required_page = "card-transactions"
    required_action = "update"

    def post(self, request, pk):
        tx = channels_service.reject_card_transaction(pk)
        return Response(channels_service._serialize_card_tx(tx))


# ——— E-wallets ———


class EWalletProviderListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "e-wallets"
    required_action = "view"

    def get(self, request):
        return Response(channels_service.list_wallet_providers())

    def post(self, request):
        self.required_action = "update"
        item = channels_service.create_wallet_provider(data=request.data)
        return Response(
            channels_service._serialize_wallet_provider(item),
            status=status.HTTP_201_CREATED,
        )


class EWalletProviderDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "e-wallets"
    required_action = "update"

    def patch(self, request, pk):
        item = channels_service.update_wallet_provider(pk, data=request.data)
        return Response(channels_service._serialize_wallet_provider(item))

    def delete(self, request, pk):
        channels_service.delete_wallet_provider(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EWalletAccountListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "e-wallets"
    required_action = "view"

    def get(self, request):
        return Response(
            channels_service.list_wallet_accounts(
                provider_id=request.query_params.get("provider")
            )
        )

    def post(self, request):
        self.required_action = "update"
        item = channels_service.create_wallet_account(data=request.data)
        return Response(
            channels_service._serialize_wallet_account(item),
            status=status.HTTP_201_CREATED,
        )


class EWalletAccountDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "e-wallets"
    required_action = "update"

    def patch(self, request, pk):
        item = channels_service.update_wallet_account(pk, data=request.data)
        return Response(channels_service._serialize_wallet_account(item))

    def delete(self, request, pk):
        channels_service.delete_wallet_account(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EWalletMovementListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "e-wallets"
    required_action = "view"

    def get(self, request):
        return Response(
            channels_service.list_wallet_movements(
                account_id=request.query_params.get("e_wallet_account")
            )
        )

    def post(self, request):
        self.required_action = "update"
        post = request.data.get("post") in (True, "true", "1", 1)
        movement = channels_service.create_wallet_movement(
            data=request.data, user=request.user, post=post
        )
        return Response(
            channels_service._serialize_wallet_movement(movement),
            status=status.HTTP_201_CREATED,
        )


class EWalletMovementPostView(APIView):
    permission_classes = [HasPageAction]
    required_page = "e-wallets"
    required_action = "update"

    def post(self, request, pk):
        movement = channels_service.post_wallet_movement(pk, request.user)
        return Response(channels_service._serialize_wallet_movement(movement))


class ChannelTransferListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "e-wallets"
    required_action = "view"

    def get(self, request):
        return Response(channels_service.list_channel_transfers())

    def post(self, request):
        self.required_action = "update"
        post = request.data.get("post") in (True, "true", "1", 1)
        item = channels_service.create_channel_transfer(
            data=request.data, user=request.user, post=post
        )
        return Response(
            channels_service._serialize_channel_transfer(item),
            status=status.HTTP_201_CREATED,
        )


class BankingStatementView(APIView):
    permission_classes = [HasPageAction]
    required_page = "banking-statements"
    required_action = "view"

    def get(self, request):
        entity_type = request.query_params.get("type")
        entity_id = request.query_params.get("entity_id")
        if not entity_type or not entity_id:
            return Response(
                {"detail": "حدد type و entity_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            channels_service.account_statement(
                entity_type=entity_type,
                entity_id=entity_id,
                date_from=request.query_params.get("from"),
                date_to=request.query_params.get("to"),
            )
        )
