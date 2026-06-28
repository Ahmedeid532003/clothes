"""حقول Serializer مشتركة."""

from django.utils import timezone
from rest_framework import serializers


class DefaultTodayDateField(serializers.DateField):
    """DateField — إذا تُرك فارغاً يُستخدم تاريخ اليوم المحلي."""

    def __init__(self, **kwargs):
        kwargs.setdefault("required", False)
        kwargs.setdefault("allow_null", True)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        if data is None or data == "":
            data = timezone.localdate().isoformat()
        return super().to_internal_value(data)
