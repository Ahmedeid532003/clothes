"""الموديولات التي يمكن تفعيلها لكل منشأة (من الأدمن — بدون كتابة JSON)."""

TENANT_MODULE_CHOICES: list[tuple[str, str]] = [
    ("hr", "الموارد البشرية (HR)"),
    ("purchases", "المشتريات"),
    ("inventory", "المخزون"),
    ("crm", "العملاء (CRM)"),
    ("pos", "نقطة البيع (POS)"),
    ("accounting", "المحاسبة"),
]

TENANT_MODULE_CODES: list[str] = [code for code, _ in TENANT_MODULE_CHOICES]
