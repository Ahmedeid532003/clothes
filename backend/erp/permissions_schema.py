"""تعريف صفحات النظام وصلاحياتها الافتراضية."""

from __future__ import annotations

# صفحات يمكن التحكم في ظهورها من شريط التنقل
SYSTEM_PAGES: list[dict[str, str]] = [
    {"key": "home", "label_en": "Home", "label_ar": "الرئيسية"},
    {"key": "dashboard", "label_en": "Dashboard", "label_ar": "لوحة التحكم"},
    {"key": "create-users", "label_en": "Create User", "label_ar": "إنشاء الموظفين"},
    {"key": "departments", "label_en": "Administrations", "label_ar": "الإدارات"},
    {"key": "hr-job-structure", "label_en": "Job Structure", "label_ar": "الهيكل الوظيفي"},
    {"key": "hr-sections", "label_en": "HR Sections", "label_ar": "الأقسام"},
    {"key": "work-shifts", "label_en": "Shift Management", "label_ar": "إدارة الورديات"},
    {"key": "job-titles", "label_en": "Job Titles", "label_ar": "المسميات الوظيفية"},
    {"key": "employee-groups", "label_en": "Employee Groups", "label_ar": "مجموعات الموظفين"},
    {"key": "employee-data", "label_en": "Employee Data", "label_ar": "بيانات الموظفين"},
    {"key": "employee-reports", "label_en": "Employee Reports", "label_ar": "تقارير الموظفين"},
    {"key": "bonus-items", "label_en": "Bonus Items", "label_ar": "بنود المكافآت"},
    {"key": "bonuses", "label_en": "Bonuses", "label_ar": "المكافآت"},
    {"key": "deduction-items", "label_en": "Deduction Items", "label_ar": "بنود الخصومات"},
    {"key": "deductions", "label_en": "Deductions", "label_ar": "الخصومات"},
    {"key": "allowance-items", "label_en": "Allowance Items", "label_ar": "بنود البدلات"},
    {"key": "allowances", "label_en": "Allowances", "label_ar": "البدلات"},
    {"key": "leave-types", "label_en": "Leave Types", "label_ar": "أنواع الإجازات"},
    {"key": "leaves", "label_en": "Employee Leaves", "label_ar": "إجازات الموظفين"},
    {"key": "official-holidays", "label_en": "Official Holidays", "label_ar": "الإجازات الرسمية"},
    {"key": "attendance", "label_en": "Attendance", "label_ar": "الحضور والانصراف"},
    {"key": "attendance-import", "label_en": "Attendance Import", "label_ar": "استيراد البصمة"},
    {"key": "employee-commissions", "label_en": "Commissions", "label_ar": "عمولات الموظفين"},
    {"key": "payroll", "label_en": "Payroll Sheet", "label_ar": "كشف الرواتب"},
    {"key": "payment-auth-types", "label_en": "Payment Types", "label_ar": "أنواع أذونات الدفع"},
    {"key": "payroll-payments", "label_en": "Payroll Payments", "label_ar": "أذونات صرف الرواتب"},
    {"key": "payroll-advances", "label_en": "Payroll & Advances", "label_ar": "الرواتب والسلف"},
    {"key": "purchase-invoices", "label_en": "Purchase Invoices", "label_ar": "فواتير الشراء"},
    {"key": "purchase-return-invoices", "label_en": "Purchase Returns", "label_ar": "مرتجع الشراء"},
    {
        "key": "reorder-alerts",
        "label_en": "Reorder Alerts",
        "label_ar": "مطلوب تكرار شراؤه",
    },
    {"key": "purchase-orders", "label_en": "Purchase Orders", "label_ar": "أوامر الشراء"},
    {"key": "sales-invoices", "label_en": "Sales Invoices", "label_ar": "فواتير المبيعات"},
    {"key": "sales-returns", "label_en": "Sales Returns", "label_ar": "مردودات المبيعات"},
    {"key": "tax-invoices", "label_en": "Tax Invoices", "label_ar": "الفواتير الضريبية"},
    {"key": "sales-quotations", "label_en": "Sales Quotations", "label_ar": "عروض الأسعار"},
    {"key": "customer-reservations", "label_en": "Customer Reservations", "label_ar": "حجوزات العملاء"},
    {"key": "seller-performance", "label_en": "Seller Performance", "label_ar": "مبيعات البائعين"},
    {"key": "pos", "label_en": "Point of Sale", "label_ar": "نقطة البيع"},
    {"key": "pos-barcode", "label_en": "Barcode POS", "label_ar": "بيع بالباركود"},
    # مخزون — مرحلة 0 و 1
    {"key": "warehouses", "label_en": "Warehouses", "label_ar": "المخازن"},
    {"key": "seasons", "label_en": "Seasons", "label_ar": "المواسم"},
    {"key": "product-sections", "label_en": "Product Sections", "label_ar": "أقسام المنتجات"},
    {"key": "brands", "label_en": "Brands", "label_ar": "العلامات التجارية"},
    {"key": "classifications", "label_en": "Classifications", "label_ar": "التصنيفات"},
    {"key": "sizes", "label_en": "Sizes", "label_ar": "المقاسات"},
    {"key": "colors", "label_en": "Colors", "label_ar": "الألوان"},
    {"key": "products", "label_en": "Products", "label_ar": "الأصناف"},
    {"key": "stock-balances", "label_en": "Stock Balances", "label_ar": "أرصدة المخازن"},
    {"key": "stock-transfers", "label_en": "Stock Transfers", "label_ar": "إذونات التحويل"},
    {"key": "stock-scrap", "label_en": "Stock Scrap", "label_ar": "إذونات الهالك"},
    {"key": "stock-disbursements", "label_en": "Stock Disbursements", "label_ar": "أذون الصرف"},
    {"key": "stock-additions", "label_en": "Stock Additions", "label_ar": "أذون الإضافة"},
    {"key": "stock-valuation", "label_en": "Stock Valuation", "label_ar": "تقييم المخزن"},
    {"key": "stock-count", "label_en": "Stock Count & Reconciliation", "label_ar": "مراجعة وتسوية الجرد"},
    {"key": "scan-orders", "label_en": "Barcode Orders", "label_ar": "الأوردرات"},
    {"key": "composite-products", "label_en": "Bundle Products", "label_ar": "أصناف مركبة"},
    {"key": "price-adjustments", "label_en": "Price Adjustments", "label_ar": "تعديل الأسعار"},
    {"key": "barcode-print", "label_en": "Barcode Print", "label_ar": "طباعة الباركود"},
    # موردين
    {"key": "supplier-types", "label_en": "Supplier Types", "label_ar": "أنواع الموردين"},
    {"key": "supplier-groups", "label_en": "Supplier Groups", "label_ar": "مجموعات الموردين"},
    {"key": "supplier-categories", "label_en": "Supplier Categories", "label_ar": "مجموعات تصنيف الموردين"},
    {"key": "supplier-departments", "label_en": "Supplier Departments", "label_ar": "أقسام الموردين"},
    {"key": "suppliers", "label_en": "Suppliers", "label_ar": "الموردين"},
    {"key": "supplier-departments", "label_en": "Supplier Departments", "label_ar": "أقسام الموردين"},
    {"key": "supplier-data", "label_en": "Supplier Data", "label_ar": "بيانات الموردين"},
    {
        "key": "supplier-inventories",
        "label_en": "Supplier Group Inventory",
        "label_ar": "مخزون مجموعات الموردين",
    },
    {
        "key": "general-item-movement",
        "label_en": "General Item Movement Report",
        "label_ar": "تقرير حركة أصناف عام",
    },
    {
        "key": "supplier-weekly-reports",
        "label_en": "Supplier Weekly Reports",
        "label_ar": "كشف الموردون",
    },
    {
        "key": "supplier-accounts",
        "label_en": "Supplier Accounts",
        "label_ar": "حسابات الموردين",
    },
    {
        "key": "supplier-payments",
        "label_en": "Supplier Payments",
        "label_ar": "إذونات دفع الموردين",
    },
    {
        "key": "expense-types",
        "label_en": "General Expense Types",
        "label_ar": "أنواع المصروفات العامة",
    },
    {
        "key": "expense-vouchers",
        "label_en": "General Expense Vouchers",
        "label_ar": "أذونات المصروفات العامة",
    },
    {
        "key": "cash-shifts",
        "label_en": "Cash Shifts",
        "label_ar": "الورديات",
    },
    {
        "key": "shift-handovers",
        "label_en": "Shift Handovers",
        "label_ar": "استلام الورديات",
    },
    {
        "key": "treasury-movements",
        "label_en": "Treasury & Liquidity",
        "label_ar": "حركة الصناديق",
    },
    {
        "key": "pending-shifts",
        "label_en": "Pending Shifts",
        "label_ar": "الورديات المعلقة",
    },
    {
        "key": "enterprise-cash-balances",
        "label_en": "Enterprise Cash Balances",
        "label_ar": "أرصدة المنشأة النقدية",
    },
    {
        "key": "chart-of-accounts",
        "label_en": "Chart of Accounts",
        "label_ar": "شجرة الحسابات",
    },
    {
        "key": "currencies",
        "label_en": "Currencies",
        "label_ar": "العملات",
    },
    {
        "key": "asset-depreciation",
        "label_en": "Asset Depreciation",
        "label_ar": "إهلاك الأصول",
    },
    {
        "key": "journal-entries",
        "label_en": "Journal Entries",
        "label_ar": "دفتر القيود اليومية",
    },
    {
        "key": "trial-balance",
        "label_en": "Trial Balance",
        "label_ar": "ميزان المراجعة",
    },
    {
        "key": "balance-sheet",
        "label_en": "Balance Sheet",
        "label_ar": "الميزانية العمومية",
    },
    {
        "key": "income-statement",
        "label_en": "Income Statement",
        "label_ar": "تقرير الدخل",
    },
    {
        "key": "general-ledger",
        "label_en": "General Ledger",
        "label_ar": "دفتر الأستاذ",
    },
    {
        "key": "banks",
        "label_en": "Banks",
        "label_ar": "البنوك",
    },
    {
        "key": "bank-accounts",
        "label_en": "Bank Accounts",
        "label_ar": "حسابات البنوك",
    },
    {
        "key": "cheques",
        "label_en": "Cheques",
        "label_ar": "الشيكات",
    },
    {
        "key": "card-transactions",
        "label_en": "Card Payments (Visa)",
        "label_ar": "حساب الفيزا / البطاقات",
    },
    {
        "key": "e-wallets",
        "label_en": "E-Wallets",
        "label_ar": "المحافظ الإلكترونية",
    },
    {
        "key": "banking-statements",
        "label_en": "Banking Statements",
        "label_ar": "كشوف الحسابات البنكية",
    },
    {
        "key": "payment-methods-dashboard",
        "label_en": "Payment Methods Dashboard",
        "label_ar": "لوحة طرق الدفع",
    },
    {
        "key": "customer-types",
        "label_en": "Customer Types",
        "label_ar": "أنواع العملاء",
    },
    {
        "key": "customer-groups",
        "label_en": "Customer Groups",
        "label_ar": "مجموعات العملاء",
    },
    {
        "key": "customers",
        "label_en": "Customers",
        "label_ar": "العملاء",
    },
    {
        "key": "customer-dashboard",
        "label_en": "Customer CRM Dashboard",
        "label_ar": "لوحة العملاء",
    },
    {
        "key": "customer-arrears",
        "label_en": "Customer Arrears",
        "label_ar": "تأخيرات العملاء",
    },
    {
        "key": "customer-accounts",
        "label_en": "Customer Account Statement",
        "label_ar": "كشف حساب عميل",
    },
    {
        "key": "customer-installments",
        "label_en": "Installments",
        "label_ar": "هيكلة الأقساط",
    },
    {
        "key": "installment-collection",
        "label_en": "Installment Collection",
        "label_ar": "تحصيل الأقساط",
    },
    {
        "key": "installment-follow-up",
        "label_en": "Installment Follow-up",
        "label_ar": "متابع الأقساط",
    },
    {
        "key": "customer-consignment",
        "label_en": "Consignment Inventory",
        "label_ar": "جرد أمانات المحلات",
    },
    {
        "key": "customer-stock-count",
        "label_en": "Customer Stock Count",
        "label_ar": "جرد بضاعة العميل",
    },
    {
        "key": "supplier-discounts",
        "label_en": "Supplier Discount Notice",
        "label_ar": "إشعار خصم مورد",
    },
    {
        "key": "store-discounts",
        "label_en": "Store Promotion",
        "label_ar": "إشعار خصم / عرض",
    },
]

# عناصر داخل كل صفحة (ما يظهر داخل الشاشة)
PAGE_FEATURES: dict[str, list[dict[str, str]]] = {
    "departments": [
        {"key": "table", "label_en": "Data table", "label_ar": "جدول البيانات"},
        {"key": "export", "label_en": "Export", "label_ar": "تصدير"},
        {"key": "filters", "label_en": "Column filters", "label_ar": "فلاتر الأعمدة"},
    ],
    "create-users": [
        {"key": "table", "label_en": "Data table", "label_ar": "جدول البيانات"},
        {"key": "permissions", "label_en": "Permissions editor", "label_ar": "محرر الصلاحيات"},
        {"key": "export", "label_en": "Export", "label_ar": "تصدير"},
    ],
    "dashboard": [
        {"key": "metrics", "label_en": "Main metrics", "label_ar": "المؤشرات الرئيسية"},
        {"key": "fund", "label_en": "Daily fund", "label_ar": "صندوق اليوم"},
        {"key": "branch_sales", "label_en": "Branch sales", "label_ar": "مبيعات الفروع"},
    ],
    "home": [
        {"key": "quick_actions", "label_en": "Quick actions", "label_ar": "إجراءات سريعة"},
    ],
    "purchase-invoices": [
        {"key": "table", "label_en": "Invoices table", "label_ar": "جدول الفواتير"},
        {"key": "add", "label_en": "Add invoice", "label_ar": "إضافة فاتورة"},
    ],
    "purchase-return-invoices": [
        {"key": "table", "label_en": "Returns table", "label_ar": "جدول المرتجعات"},
        {"key": "add", "label_en": "Add return", "label_ar": "إضافة مرتجع"},
    ],
    "reorder-alerts": [
        {"key": "table", "label_en": "Alerts table", "label_ar": "جدول التنبيهات"},
        {"key": "export", "label_en": "Generate PO PDF", "label_ar": "استخراج أوامر الشراء"},
    ],
    "purchase-orders": [
        {"key": "table", "label_en": "Orders table", "label_ar": "جدول الأوامر"},
        {"key": "receive", "label_en": "Receive shipment", "label_ar": "تسجيل الاستلام"},
    ],
    "pos": [
        {"key": "sell", "label_en": "Sell", "label_ar": "بيع"},
        {"key": "barcode", "label_en": "Barcode scan", "label_ar": "مسح باركود"},
        {"key": "history", "label_en": "Sales history", "label_ar": "سجل المبيعات"},
    ],
    "pos-barcode": [
        {"key": "sell", "label_en": "Sell tab", "label_ar": "تبويب البيع"},
        {"key": "exchange", "label_en": "Exchange tab", "label_ar": "تبويب التبديل"},
        {"key": "collect", "label_en": "Collection tab", "label_ar": "تبويب التحصيل"},
        {"key": "edit_line_price", "label_en": "Edit line price/discount", "label_ar": "تعديل سعر وخصم الصنف"},
    ],
}

_DEFAULT_CRUD_FEATURES = [
    {"key": "table", "label_en": "Data table", "label_ar": "جدول البيانات"},
    {"key": "add", "label_en": "Add", "label_ar": "إضافة"},
    {"key": "export", "label_en": "Export", "label_ar": "تصدير"},
]

for _page in (
    "warehouses",
    "seasons",
    "product-sections",
    "brands",
    "classifications",
    "sizes",
    "colors",
    "products",
    "stock-balances",
    "stock-transfers",
    "stock-scrap",
    "stock-disbursements",
    "stock-additions",
    "stock-valuation",
    "stock-count",
    "scan-orders",
    "composite-products",
    "price-adjustments",
    "barcode-print",
    "supplier-types",
    "supplier-groups",
    "supplier-categories",
    "supplier-departments",
    "suppliers",
    "supplier-inventories",
    "general-item-movement",
    "supplier-weekly-reports",
    "supplier-accounts",
    "supplier-payments",
    "supplier-discounts",
    "store-discounts",
    "expense-types",
    "expense-vouchers",
    "cash-shifts",
    "shift-handovers",
    "treasury-movements",
    "pending-shifts",
    "enterprise-cash-balances",
    "chart-of-accounts",
    "currencies",
    "asset-depreciation",
    "journal-entries",
    "trial-balance",
    "balance-sheet",
    "income-statement",
    "general-ledger",
    "customer-types",
    "customer-groups",
    "customers",
    "customer-dashboard",
    "customer-arrears",
    "customer-accounts",
    "customer-installments",
    "installment-follow-up",
    "customer-consignment",
    "customer-stock-count",
    "departments",
    "hr-job-structure",
    "hr-sections",
    "work-shifts",
    "job-titles",
    "employee-groups",
    "employee-data",
    "employee-reports",
    "bonus-items",
    "bonuses",
    "deduction-items",
    "deductions",
    "allowance-items",
    "allowances",
    "leave-types",
    "leaves",
    "official-holidays",
    "attendance",
    "attendance-import",
    "employee-commissions",
    "payroll",
    "payment-auth-types",
    "payroll-payments",
):
    PAGE_FEATURES[_page] = list(_DEFAULT_CRUD_FEATURES)

PAGE_FEATURES["stock-transfers"].append(
    {"key": "approve", "label_en": "Approve transfers", "label_ar": "اعتماد التحويلات"}
)
PAGE_FEATURES["expense-vouchers"].append(
    {"key": "approve", "label_en": "Approve & post vouchers", "label_ar": "اعتماد وترحيل الأذونات"}
)
PAGE_FEATURES["cash-shifts"].append(
    {"key": "approve", "label_en": "Approve shifts", "label_ar": "اعتماد الورديات"}
)
PAGE_FEATURES["cash-shifts"].append(
    {
        "key": "view_details",
        "label_en": "View shift details on close",
        "label_ar": "عرض تفاصيل الوردية عند الإغلاق",
    }
)
PAGE_FEATURES["cash-shifts"].append(
    {
        "key": "receive_treasury",
        "label_en": "Receive shift cash to treasury",
        "label_ar": "استلام مبلغ الوردية للخزينة",
    }
)
PAGE_FEATURES["shift-handovers"].append(
    {"key": "approve", "label_en": "Approve handovers", "label_ar": "اعتماد التسليم"}
)
PAGE_FEATURES["treasury-movements"].append(
    {"key": "approve", "label_en": "Post movements", "label_ar": "ترحيل الحركات"}
)
PAGE_FEATURES["pending-shifts"].append(
    {"key": "approve", "label_en": "Manual approve", "label_ar": "اعتماد يدوي"}
)
PAGE_FEATURES["asset-depreciation"].append(
    {"key": "approve", "label_en": "Bulk depreciation", "label_ar": "إهلاك جماعي"}
)
PAGE_FEATURES["journal-entries"].append(
    {"key": "approve", "label_en": "Approve & post entries", "label_ar": "اعتماد وترحيل القيود"}
)

ACTION_KEYS = ("view", "update", "delete")
_APPROVE_ACTION_KEYS = ACTION_KEYS + ("approve",)


def _action_keys_for_page(page_key: str) -> tuple[str, ...]:
    if page_key in (
        "stock-transfers",
        "expense-vouchers",
        "cash-shifts",
        "shift-handovers",
        "treasury-movements",
        "pending-shifts",
        "asset-depreciation",
        "journal-entries",
    ):
        return _APPROVE_ACTION_KEYS
    return ACTION_KEYS


def empty_permissions() -> dict:
    pages = {p["key"]: False for p in SYSTEM_PAGES}
    features: dict[str, dict[str, bool]] = {}
    actions: dict[str, dict[str, bool]] = {}
    for page in SYSTEM_PAGES:
        key = page["key"]
        features[key] = {f["key"]: False for f in PAGE_FEATURES.get(key, [])}
        actions[key] = {a: False for a in _action_keys_for_page(key)}
    return {"pages": pages, "features": features, "actions": actions}


def full_permissions() -> dict:
    pages = {p["key"]: True for p in SYSTEM_PAGES}
    features: dict[str, dict[str, bool]] = {}
    actions: dict[str, dict[str, bool]] = {}
    for page in SYSTEM_PAGES:
        key = page["key"]
        features[key] = {f["key"]: True for f in PAGE_FEATURES.get(key, [])}
        actions[key] = {a: True for a in _action_keys_for_page(key)}
    return {"pages": pages, "features": features, "actions": actions}


def effective_user_permissions(user) -> dict:
    """صلاحيات فعّالة: المالك = كامل الصلاحيات."""
    if getattr(user, "is_owner", False):
        return full_permissions()
    return merge_permissions(user.permissions)


def merge_permissions(stored: dict | None) -> dict:
    base = empty_permissions()
    if not stored:
        return base
    for section in ("pages", "features", "actions"):
        incoming = stored.get(section) or {}
        if section == "pages":
            for k, v in incoming.items():
                if k in base["pages"]:
                    base["pages"][k] = bool(v)
        else:
            for page_key, perms in incoming.items():
                if page_key not in base[section]:
                    continue
                for fk, fv in (perms or {}).items():
                    if fk in base[section][page_key]:
                        base[section][page_key][fk] = bool(fv)
    return base
