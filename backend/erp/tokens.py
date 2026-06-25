from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken


def build_tokens_for_user(user, tenant_slug: str) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh[settings.JWT_TENANT_CLAIM] = tenant_slug
    refresh["user_id"] = str(user.pk)
    if user.default_branch_id:
        refresh[settings.JWT_BRANCH_CLAIM] = str(user.default_branch_id)

    access = refresh.access_token
    access[settings.JWT_TENANT_CLAIM] = tenant_slug
    access["user_id"] = str(user.pk)
    if user.default_branch_id:
        access[settings.JWT_BRANCH_CLAIM] = str(user.default_branch_id)

    return {
        "refresh": str(refresh),
        "access": str(access),
    }
