"""تشفير بسيط لكلمات مرور قواعد بيانات المحلات (مخزنة في MainClothes فقط)."""
from django.core import signing

_SALT = "ma7aly.tenant_db_password"


def encrypt_db_password(plain: str) -> str:
    return signing.dumps(plain, salt=_SALT)


def decrypt_db_password(stored: str) -> str:
    return signing.loads(stored, salt=_SALT, max_age=None)
