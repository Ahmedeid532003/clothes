import re

from django import forms
from django.core.exceptions import ValidationError

from saas.billing import compute_payment_amount
from saas.models import GlobalUsername, PaymentRecord, Plan, Tenant
from saas.module_catalog import TENANT_MODULE_CHOICES, TENANT_MODULE_CODES
from saas.widgets import ModuleCardWidget

MAX_BRANCH_SLOTS = 10
_PG_USER_RE = re.compile(r"^[a-z_][a-z0-9_]{0,62}$")


class PlanSelect(forms.Select):
    def __init__(self, *args, **kwargs):
        attrs = kwargs.setdefault("attrs", {})
        attrs.setdefault(
            "onchange",
            "window.ma7alyOnPlanChange && window.ma7alyOnPlanChange()",
        )
        super().__init__(*args, **kwargs)

    def create_option(self, name, value, label, selected, index, subindex=None, attrs=None):
        option = super().create_option(name, value, label, selected, index, subindex, attrs)
        if value in ("", None):
            return option
        pk = getattr(value, "value", value)
        if not pk:
            return option
        try:
            plan = Plan.objects.get(pk=pk)
            option["attrs"]["data-max-branches"] = str(plan.max_branches)
            option["attrs"]["data-plan-name"] = plan.name
        except (Plan.DoesNotExist, ValueError, TypeError):
            pass
        return option


class TenantModulesMixin:
    """اختيار الموديولات بصناديق اختيار — ليس JSON."""

    def _attach_modules_field(self) -> None:
        self.fields["modules"] = forms.MultipleChoiceField(
            label="الموديولات المفعّلة",
            choices=TENANT_MODULE_CHOICES,
            widget=ModuleCardWidget(),
            help_text="اضغط على البطاقة لاختيار الموديول أو إلغائه.",
            required=True,
        )
        instance = getattr(self, "instance", None)
        if instance and instance.pk:
            self.fields["modules"].initial = instance.modules or []

    def clean_modules(self):
        modules = self.cleaned_data.get("modules") or []
        if not modules:
            raise ValidationError("اختر موديولاً واحداً على الأقل.")
        invalid = [m for m in modules if m not in TENANT_MODULE_CODES]
        if invalid:
            raise ValidationError(f"موديولات غير معروفة: {', '.join(invalid)}")
        return list(dict.fromkeys(modules))


class TenantCreateForm(TenantModulesMixin, forms.ModelForm):
    owner_username = forms.CharField(
        label="اسم مستخدم المالك",
        max_length=150,
        help_text="فريد على كل المنصة — مثال: hany@magyfashion",
    )
    owner_password = forms.CharField(
        label="كلمة مرور المالك",
        widget=forms.PasswordInput(render_value=True),
        min_length=6,
    )
    owner_full_name = forms.CharField(
        label="الاسم الكامل",
        max_length=200,
        required=False,
    )
    db_user = forms.CharField(
        label="يوزر قاعدة البيانات (PostgreSQL)",
        max_length=63,
        help_text="حروف إنجليزية صغيرة وأرقام و _ فقط — مثال: mahaly_magy",
    )
    db_password = forms.CharField(
        label="باسورد قاعدة البيانات (PostgreSQL)",
        widget=forms.PasswordInput(render_value=True),
        min_length=8,
        help_text="يُستخدم لإنشاء دور PostgreSQL ويُعرض لاحقاً في صفحة المنشأة",
    )

    class Meta:
        model = Tenant
        fields = ("name", "slug", "plan", "contact_email", "contact_phone")
        widgets = {"plan": PlanSelect()}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._attach_modules_field()
        field_order = [
            "name",
            "slug",
            "plan",
            "modules",
            "contact_email",
            "contact_phone",
            "owner_username",
            "owner_password",
            "owner_full_name",
            "db_user",
            "db_password",
        ]
        for i in range(1, MAX_BRANCH_SLOTS + 1):
            self.fields[f"branch_{i}_name"] = forms.CharField(
                label=f"اسم الفرع {i}",
                max_length=200,
                required=False,
            )
            self.fields[f"branch_{i}_image"] = forms.ImageField(
                label=f"صورة الفرع {i}",
                required=False,
            )
            field_order.extend([f"branch_{i}_name", f"branch_{i}_image"])
        self.order_fields(field_order)

    def clean_slug(self):
        slug = self.cleaned_data["slug"].strip().lower()
        if Tenant.objects.filter(slug=slug).exists():
            raise ValidationError("كود المحل مستخدم بالفعل.")
        return slug

    def clean_owner_username(self):
        username = self.cleaned_data["owner_username"].strip().lower()
        if " " in username:
            raise ValidationError("اسم المستخدم لا يجب أن يحتوي مسافات.")
        if GlobalUsername.objects.filter(username=username).exists():
            raise ValidationError("اسم المستخدم مستخدم بالفعل في منشأة أخرى.")
        return username

    def clean_db_user(self):
        user = self.cleaned_data["db_user"].strip().lower()
        if not _PG_USER_RE.match(user):
            raise ValidationError(
                "يوزر PostgreSQL: يبدأ بحرف أو _ ثم حروف/أرقام/_ فقط (حد أقصى 63)."
            )
        reserved = {"postgres", "public", "template0", "template1"}
        if user in reserved:
            raise ValidationError("هذا الاسم محجوز في PostgreSQL.")
        if Tenant.objects.filter(db_user=user).exists():
            raise ValidationError("يوزر قاعدة البيانات مستخدم لمنشأة أخرى.")
        return user

    def clean(self):
        cleaned = super().clean()
        plan = cleaned.get("plan")
        if not plan:
            return cleaned

        filled = 0
        for i in range(1, plan.max_branches + 1):
            name = (cleaned.get(f"branch_{i}_name") or "").strip()
            if name:
                filled += 1
            else:
                self.add_error(
                    f"branch_{i}_name",
                    ValidationError(f"اسم الفرع {i} مطلوب لباقة «{plan.name}»."),
                )

        if filled != plan.max_branches:
            self.add_error(
                "plan",
                ValidationError(
                    f"باقة «{plan.name}» تتطلب {plan.max_branches} فرع/فروع بأسماء "
                    f"(تم إدخال {filled}). تأكد من اختيار الباقة وملء كل حقول الفروع الظاهرة."
                ),
            )
            self.add_error(
                None,
                ValidationError(
                    f"تبويب «الفروع حسب الباقة»: أدخل {plan.max_branches} اسم/أسماء فرع "
                    f"بعد اختيار الباقة في General."
                ),
            )

        if "modules" in self.errors:
            self.add_error(
                None,
                ValidationError("تبويب «الموديولات»: اختر موديولاً واحداً على الأقل."),
            )

        return cleaned

    def get_branch_inputs(self):
        from tenancy.onboarding import BranchInput

        plan = self.cleaned_data.get("plan")
        if not plan:
            return []

        branches: list[BranchInput] = []
        for i in range(1, plan.max_branches + 1):
            name = (self.cleaned_data.get(f"branch_{i}_name") or "").strip()
            if not name:
                continue
            branches.append(
                BranchInput(
                    name=name,
                    image=self.cleaned_data.get(f"branch_{i}_image"),
                )
            )
        return branches

    def get_owner_input(self):
        from tenancy.onboarding import OwnerInput

        return OwnerInput(
            username=self.cleaned_data["owner_username"],
            password=self.cleaned_data["owner_password"],
            full_name=self.cleaned_data.get("owner_full_name") or "",
        )

    def get_db_credentials(self) -> tuple[str, str]:
        return self.cleaned_data["db_user"], self.cleaned_data["db_password"]

    def get_enabled_modules(self) -> list[str]:
        return self.cleaned_data.get("modules") or []


class TenantChangeForm(TenantModulesMixin, forms.ModelForm):
    class Meta:
        model = Tenant
        fields = ("name", "slug", "plan", "status", "contact_email", "contact_phone")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._attach_modules_field()

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.modules = self.cleaned_data.get("modules") or []
        if commit:
            instance.save()
        return instance


class PaymentRecordForm(forms.ModelForm):
    class Meta:
        model = PaymentRecord
        fields = (
            "tenant",
            "renewal_months",
            "amount",
            "method",
            "reference",
            "paid_at",
            "notes",
        )
        widgets = {
            "tenant": forms.Select(attrs={"class": "vTextField ma7aly-tenant-select"}),
            "renewal_months": forms.NumberInput(
                attrs={"class": "vIntegerField", "min": 1, "max": 60}
            ),
            "amount": forms.NumberInput(attrs={"class": "vTextField", "step": "0.01"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["tenant"].queryset = Tenant.objects.select_related("plan").order_by(
            "name"
        )
        self.fields["tenant"].label_from_instance = (
            lambda t: f"{t.name} ({t.slug}) — {t.plan.name}"
        )
        self.fields["renewal_months"].help_text = (
            "يُضاف على تاريخ انتهاء الاشتراك (أو من اليوم إن كان منتهياً)."
        )
        self.fields["amount"].help_text = "يُحسب تلقائياً = السعر الشهري × عدد الشهور (يمكن تعديله)."

        if self.instance and self.instance.pk:
            self.fields["renewal_months"].help_text = (
                "عدد الشهور المسجّل مع هذه الدفعة (التمديد يُطبَّق عند الإنشاء فقط)."
            )

    def clean(self):
        cleaned = super().clean()
        tenant = cleaned.get("tenant")
        months = cleaned.get("renewal_months")
        if tenant and months:
            expected = compute_payment_amount(tenant, months)
            amount = cleaned.get("amount")
            if amount is None:
                cleaned["amount"] = expected
        return cleaned
