"""صلاحيات DRF حسب صفحات النظام."""

from rest_framework.permissions import BasePermission

from erp.branch_access import effective_permissions


def can_access_page(user, page_key: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_owner", False):
        return True
    perms = effective_permissions(user)
    return bool(perms.get("pages", {}).get(page_key))


def can_perform_action(user, page_key: str, action: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_owner", False):
        return True
    perms = effective_permissions(user)
    return bool(perms.get("actions", {}).get(page_key, {}).get(action))


def can_use_feature(user, page_key: str, feature_key: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_owner", False):
        return True
    if not can_access_page(user, page_key):
        return False
    perms = effective_permissions(user)
    return bool(perms.get("features", {}).get(page_key, {}).get(feature_key))


class IsOwner(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_owner)


class HasPagePermission(BasePermission):
    """يتطلب page_key على الـ view."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_owner:
            return True
        page_key = getattr(view, "required_page", None)
        if not page_key:
            return True
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return can_access_page(user, page_key)
        return can_perform_action(user, page_key, "update") or can_access_page(
            user, page_key
        )


class HasPosOrBarcodePage(BasePermission):
    """نقطة البيع — يكفي صلاحية pos أو pos-barcode."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_owner:
            return True
        return can_access_page(user, "pos-barcode") or can_access_page(user, "pos")


class HasPageAction(BasePermission):
    """يتطلب page_key + action_key على الـ view للكتابة."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_owner:
            return True
        page_key = getattr(view, "required_page", None)
        action = getattr(view, "required_action", "view")
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return can_access_page(user, page_key) if page_key else True
        # POST/PATCH/DELETE: الافتراضي على الـ view غالباً "view" بينما الكتابة تحتاج "update"
        if action == "view":
            action = "update"
        if page_key:
            return can_perform_action(user, page_key, action)
        return True


CUSTOMER_MODULE_PAGES = (
    "customers",
    "customer-types",
    "customer-groups",
    "customer-dashboard",
    "customer-arrears",
    "customer-accounts",
    "customer-installments",
    "installment-follow-up",
    "customer-consignment",
    "customer-stock-count",
)


class HasAnyCustomerModulePage(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_owner:
            return True
        pages = getattr(view, "customer_pages", None) or CUSTOMER_MODULE_PAGES
        return any(can_access_page(user, p) for p in pages)


SUPPLIER_MODULE_PAGES = (
    "suppliers",
    "supplier-types",
    "supplier-groups",
    "supplier-categories",
    "supplier-departments",
    "supplier-payments",
    "supplier-accounts",
    "supplier-inventories",
    "general-item-movement",
    "supplier-weekly-reports",
    "supplier-discounts",
    "store-discounts",
)


class HasAnySupplierModulePage(BasePermission):
    """صلاحية عرض أي صفحة ضمن وحدة الموردين (للبيانات المشتركة مثل meta)."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_owner:
            return True
        pages = getattr(view, "supplier_pages", None) or SUPPLIER_MODULE_PAGES
        return any(can_access_page(user, p) for p in pages)


PRICE_ADJUSTMENT_PAGES = (
    "price-adjustments",
    "supplier-discounts",
    "store-discounts",
)


class HasAnyPriceAdjustmentPage(BasePermission):
    """صلاحية شاشات تعديل الأسعار (كارت / مورد / صفحة موحّدة)."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_owner:
            return True
        pages = getattr(view, "price_adjustment_pages", None) or PRICE_ADJUSTMENT_PAGES
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return any(can_access_page(user, p) for p in pages)
        return any(can_perform_action(user, p, "update") for p in pages)


class SupplierMasterDataRead(BasePermission):
    """قراءة قوائم الموردين/المجموعات لشاشات ERP المرتبطة."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_owner:
            return True
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            return False
        pages = tuple(SUPPLIER_MODULE_PAGES) + ("price-adjustments", "purchases")
        return any(can_access_page(user, p) for p in pages)


PURCHASE_MODULE_PAGES = (
    "purchase-invoices",
    "purchase-return-invoices",
    "reorder-alerts",
    "purchase-orders",
)


class HasPurchaseModulePage(BasePermission):
    """صلاحية شاشات المشتريات — من يملك فواتير الشراء يرى أوامر الشراء وحد الطلب."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_owner:
            return True
        page_key = getattr(view, "required_page", None)
        if request.method in ("GET", "HEAD", "OPTIONS"):
            if page_key and can_access_page(user, page_key):
                return True
            return any(can_access_page(user, p) for p in PURCHASE_MODULE_PAGES)
        action = getattr(view, "required_action", "view")
        if action == "view":
            action = "update"
        if page_key and can_perform_action(user, page_key, action):
            return True
        return can_perform_action(user, "purchase-invoices", action)


class SupplierCatalogWrite(BasePermission):
    """إنشاء/تعديل تصنيفات وأقسام الموردين من شاشة الموردين أو صفحتها المخصصة."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_owner:
            return True
        page_key = getattr(view, "required_page", None)
        if page_key and can_perform_action(user, page_key, "update"):
            return True
        return can_perform_action(user, "suppliers", "update")
