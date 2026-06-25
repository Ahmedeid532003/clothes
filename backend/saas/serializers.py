from rest_framework import serializers

from saas.models import Plan


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = (
            "id",
            "code",
            "name",
            "max_branches",
            "max_users",
            "max_concurrent_users",
            "price_monthly",
        )
