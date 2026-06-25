from rest_framework import serializers


class ReorderOrderLineInputSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity_ordered = serializers.DecimalField(
        max_digits=14, decimal_places=3, required=False, allow_null=True
    )


class CreateOrdersFromReorderSerializer(serializers.Serializer):
    lines = ReorderOrderLineInputSerializer(many=True, min_length=1)


class ReceiveOrderLineSerializer(serializers.Serializer):
    line_id = serializers.UUIDField()
    quantity_received = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=0)


class ReceivePurchaseOrderSerializer(serializers.Serializer):
    lines = ReceiveOrderLineSerializer(many=True, min_length=1)
