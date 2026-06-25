"""حماية واجهات المشتريات عند غياب ترحيلات قاعدة البيانات."""

from functools import wraps

from django.db.utils import OperationalError, ProgrammingError
from rest_framework import status
from rest_framework.response import Response

SCHEMA_MSG = (
    "قاعدة بيانات المشتريات تحتاج ترقية. من مجلد backend نفّذ: "
    "python manage.py migrate_tenant --slug اسم-المستأجر"
)


def _is_schema_error(exc: BaseException) -> bool:
    text = str(exc).lower()
    markers = (
        "tax_amount",
        "payment_method",
        "tax_percent",
        "journal_entry_id",
        "purchase_invoice_id",
        "return_reason",
        "purchaseorder",
        "purchase_order",
        "does not exist",
        "no such column",
        "relation",
    )
    return any(m in text for m in markers)


def guard_purchase_db(view_method):
    @wraps(view_method)
    def wrapper(self, request, *args, **kwargs):
        try:
            return view_method(self, request, *args, **kwargs)
        except (OperationalError, ProgrammingError) as exc:
            if _is_schema_error(exc):
                return Response(
                    {"detail": SCHEMA_MSG, "code": "purchase_schema_outdated"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            raise

    return wrapper
