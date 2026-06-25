import json
import secrets
import string

from django.contrib import admin, messages
from django.utils import timezone

from saas.forms import PaymentRecordForm, TenantChangeForm, TenantCreateForm
from saas.module_catalog import TENANT_MODULE_CHOICES
from saas.models import GlobalUsername, PaymentRecord, Plan, Subscription, Tenant
from tenancy.onboarding import ensure_tenant_owner, reset_tenant_owner_password, setup_new_tenant
from tenancy.services import provision_tenant_database


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "max_branches", "max_users", "max_concurrent_users", "is_active")
    list_filter = ("is_active",)
    search_fields = ("code", "name")
    fields = (
        "code",
        "name",
        "max_branches",
        "max_users",
        "max_concurrent_users",
        "price_monthly",
        "is_active",
    )


class SubscriptionInline(admin.TabularInline):
    model = Subscription
    extra = 0
    fields = ("plan", "starts_at", "ends_at", "grace_days", "is_current")
    readonly_fields = ("plan", "starts_at")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        # ends_at و grace_days قابلة للتعديل لتفعيل المنشأة بعد التجميد
        return self.readonly_fields


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    add_form = TenantCreateForm
    change_form_template = "admin/saas/tenant/change_form.html"
    list_display = (
        "name",
        "slug",
        "owner_username",
        "status",
        "plan",
        "db_name",
        "db_user",
        "modules_display",
        "created_at",
    )
    list_filter = ("status", "plan")
    search_fields = ("name", "slug", "contact_email", "owner_username")
    readonly_fields = (
        "db_name",
        "db_user",
        "db_initial_password",
        "created_at",
        "updated_at",
        "owner_username",
        "owner_initial_password",
    )
    actions = [
        "freeze_tenants",
        "unfreeze_tenants",
        "renew_subscriptions_30d",
        "provision_databases",
        "reset_owner_passwords",
    ]

    fieldsets_add = (
        (None, {"fields": ("name", "slug", "plan", "contact_email", "contact_phone")}),
        (
            "الموديولات",
            {
                "description": "حدد الموديولات المسموح لهذه المنشأة باستخدامها في النظام.",
                "fields": ("modules",),
            },
        ),
        (
            "حساب المالك (تسجيل الدخول ERP)",
            {"fields": ("owner_username", "owner_password", "owner_full_name")},
        ),
        (
            "قاعدة البيانات (PostgreSQL)",
            {
                "description": "يوزر وباسورد منفصلان عن MainClothes — يُحفظان ويظهران في صفحة المنشأة.",
                "fields": ("db_user", "db_password"),
            },
        ),
        (
            "الفروع حسب الباقة",
            {
                "description": "اختر الباقة أولاً — سيظهر عدد حقول الفروع. اسم كل فرع مطلوب، الصورة اختيارية.",
                "fields": tuple(
                    f
                    for i in range(1, 11)
                    for f in (f"branch_{i}_name", f"branch_{i}_image")
                ),
            },
        ),
    )

    @admin.display(description="الموديولات")
    def modules_display(self, obj):
        if not obj or not obj.modules:
            return "—"
        labels = dict(TENANT_MODULE_CHOICES)
        return ", ".join(labels.get(code, code) for code in obj.modules)

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        if object_id is None:
            extra_context["ma7aly_plan_limits"] = json.dumps(
                {
                    str(p.pk): {"max": p.max_branches, "name": p.name}
                    for p in Plan.objects.filter(is_active=True)
                }
            )
        return super().changeform_view(request, object_id, form_url, extra_context)

    def get_form(self, request, obj=None, change=False, **kwargs):
        # Django 5 يبني ModelForm من الموديل — نرجّع الفورم الكامل عند الإضافة
        if obj is None:
            return self.add_form
        if obj is not None:
            kwargs.setdefault("form", TenantChangeForm)
        return super().get_form(request, obj, change=change, **kwargs)

    def get_readonly_fields(self, request, obj=None):
        # عند الإضافة لا نجعل حقول المالك للقراءة فقط (تُدخل من TenantCreateForm)
        if obj is None:
            return ()
        return self.readonly_fields

    def get_fieldsets(self, request, obj=None):
        if obj is None:
            return self.fieldsets_add
        return (
            (
                None,
                {
                    "fields": (
                        "name",
                        "slug",
                        "plan",
                        "status",
                        "contact_email",
                        "contact_phone",
                        "modules",
                    ),
                    "description": (
                        "لتفعيل منشأة مجمدة: عدّل «نهاية الاشتراك» في الأسفل إلى تاريخ مستقبلي، "
                        "أو استخدم إجراء «تفعيل وتمديد الاشتراك»."
                    ),
                },
            ),
            (
                "بيانات الدخول ERP",
                {
                    "description": "كود المحل = slug. كلمة المرور تُحفظ عند الإنشاء أو إعادة التعيين.",
                    "fields": ("owner_username", "owner_initial_password"),
                },
            ),
            (
                "قاعدة البيانات (PostgreSQL)",
                {
                    "fields": ("db_name", "db_user", "db_initial_password"),
                    "description": "بيانات الاتصال بقاعدة المحل — منفصلة عن MainClothes.",
                },
            ),
        )

    def get_inlines(self, request, obj):
        if obj is None:
            return []
        return [SubscriptionInline]

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        if not change:
            return
        from saas.subscription_policy import evaluate_tenant_subscription

        tenant = form.instance
        result = evaluate_tenant_subscription(tenant)
        tenant.refresh_from_db(fields=["status", "updated_at"])
        if result == "activated":
            self.message_user(
                request,
                f"تم تفعيل «{tenant.name}» — الاشتراك ساري.",
                messages.SUCCESS,
            )
        elif result == "frozen":
            sub = tenant.subscriptions.filter(is_current=True).order_by("-ends_at").first()
            deadline = sub.last_allowed_date if sub else "—"
            self.message_user(
                request,
                f"«{tenant.name}» ما زالت مجمدة — آخر يوم مسموح: {deadline}. "
                f"مدّد «نهاية الاشتراك» أو استخدم إجراء التفعيل.",
                messages.WARNING,
            )

    def save_model(self, request, obj, form, change):
        if change:
            super().save_model(request, obj, form, change)
            return

        owner = form.get_owner_input()
        db_user, db_password = form.get_db_credentials()
        obj.apply_db_credentials(db_user, db_password)
        obj.modules = form.get_enabled_modules()
        obj.status = Tenant.Status.PROVISIONING
        obj.owner_username = owner.username.strip().lower()
        obj.owner_initial_password = owner.password
        super().save_model(request, obj, form, change)

        try:
            setup_new_tenant(
                obj,
                owner=owner,
                branches=form.get_branch_inputs(),
            )
            obj.refresh_from_db()
            self.message_user(
                request,
                f"تم إنشاء «{obj.name}» | كود المحل: {obj.slug} | "
                f"ERP: {obj.owner_username} / {obj.owner_initial_password} | "
                f"PostgreSQL: {obj.db_user} / {obj.db_initial_password} | قاعدة: {obj.db_name}",
                messages.SUCCESS,
            )
        except Exception as exc:
            obj.status = Tenant.Status.PROVISIONING
            obj.save(update_fields=["status", "updated_at"])
            self.message_user(
                request,
                f"تم حفظ المنشأة لكن فشل الإعداد: {exc}. "
                f"استخدم إجراء «إنشاء/ترحيل قاعدة بيانات المنشأة» بعد التصحيح.",
                messages.ERROR,
            )

    class Media:
        css = {
            "all": (
                "saas/admin/tenant_add.css",
                "saas/admin/module_cards.css",
            )
        }
        js = ("saas/admin/module_cards.js", "saas/admin/tenant_add.js",)

    @admin.action(description="تجميد المنشآت المحددة")
    def freeze_tenants(self, request, queryset):
        updated = queryset.update(status=Tenant.Status.FROZEN)
        self.message_user(request, f"تم تجميد {updated} منشأة.", messages.WARNING)

    @admin.action(description="تفعيل وتمديد الاشتراك 30 يوماً")
    def unfreeze_tenants(self, request, queryset):
        from saas.subscription_policy import evaluate_tenant_subscription, renew_subscription

        activated = 0
        skipped = 0
        for tenant in queryset.exclude(status=Tenant.Status.SUSPENDED):
            sub = renew_subscription(tenant, days=30)
            if not sub:
                skipped += 1
                self.message_user(
                    request,
                    f"{tenant.slug}: لا يوجد اشتراك حالي — أنشئ اشتراكاً أولاً.",
                    messages.WARNING,
                )
                continue
            evaluate_tenant_subscription(tenant)
            tenant.refresh_from_db(fields=["status"])
            if tenant.status == Tenant.Status.ACTIVE:
                activated += 1
                self.message_user(
                    request,
                    f"{tenant.slug}: مفعّل حتى {sub.ends_at} (+{sub.grace_days} يوم سماح).",
                    messages.SUCCESS,
                )
            else:
                skipped += 1
        if activated:
            self.message_user(
                request, f"تم تفعيل {activated} منشأة.", messages.SUCCESS
            )
        if skipped and not activated:
            self.message_user(
                request,
                "لم يُفعَّل أي حساب — راجع الاشتراك أو حالة المنشأة.",
                messages.ERROR,
            )

    @admin.action(description="تمديد الاشتراك 30 يوماً (بدون تغيير الحالة يدوياً)")
    def renew_subscriptions_30d(self, request, queryset):
        from saas.subscription_policy import evaluate_tenant_subscription, renew_subscription

        renewed = 0
        for tenant in queryset:
            sub = renew_subscription(tenant, days=30)
            if not sub:
                continue
            renewed += 1
            result = evaluate_tenant_subscription(tenant)
            if result == "activated":
                self.message_user(
                    request,
                    f"{tenant.slug}: تم التمديد والتفعيل حتى {sub.last_allowed_date}.",
                    messages.SUCCESS,
                )
            else:
                self.message_user(
                    request,
                    f"{tenant.slug}: تم التمديد حتى {sub.ends_at}.",
                    messages.INFO,
                )
        if renewed:
            self.message_user(request, f"تم تمديد {renewed} اشتراكاً.", messages.SUCCESS)

    @admin.action(description="إعادة تعيين كلمة مرور المالك (عشوائية) وحفظها")
    def reset_owner_passwords(self, request, queryset):
        alphabet = string.ascii_letters + string.digits
        for tenant in queryset:
            if not tenant.owner_username:
                gu = GlobalUsername.objects.filter(tenant=tenant).first()
                if gu:
                    tenant.owner_username = gu.username
                    tenant.save(update_fields=["owner_username", "updated_at"])
                else:
                    self.message_user(
                        request,
                        f"{tenant.slug}: لا يوجد مستخدم مالك.",
                        messages.WARNING,
                    )
                    continue
            new_pass = "".join(secrets.choice(alphabet) for _ in range(10))
            try:
                reset_tenant_owner_password(tenant, new_pass)
                self.message_user(
                    request,
                    f"{tenant.slug} → مستخدم: {tenant.owner_username} | كلمة المرور: {new_pass}",
                    messages.SUCCESS,
                )
            except Exception as exc:
                self.message_user(request, f"{tenant.slug}: {exc}", messages.ERROR)

    @admin.action(description="إنشاء/ترحيل قاعدة بيانات المنشأة")
    def provision_databases(self, request, queryset):
        ok = 0
        for tenant in queryset:
            try:
                provision_tenant_database(tenant)
                owner, owner_pass = ensure_tenant_owner(tenant)
                tenant.refresh_from_db()
                ok += 1
                pg_pass = tenant.db_initial_password or tenant.get_db_password()
                self.message_user(
                    request,
                    f"{tenant.slug}: DB={tenant.db_name} | PG user={tenant.db_user} | pass={pg_pass} | "
                    f"ERP owner={owner.username} / {owner_pass}",
                    messages.SUCCESS,
                )
            except Exception as exc:
                self.message_user(
                    request,
                    f"فشل {tenant.slug}: {exc}",
                    messages.ERROR,
                )
        if ok:
            self.message_user(
                request,
                f"تم تجهيز {ok} قاعدة بيانات بدور PostgreSQL منفصل لكل منشأة.",
                messages.SUCCESS,
            )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "plan",
        "starts_at",
        "ends_at",
        "grace_days",
        "last_allowed_display",
        "is_current",
        "tenant_status",
    )
    list_filter = ("is_current", "plan", "tenant__status")
    search_fields = ("tenant__slug", "tenant__name")
    fields = (
        "tenant",
        "plan",
        "starts_at",
        "ends_at",
        "grace_days",
        "is_current",
        "notes",
    )
    actions = ["renew_30_days", "activate_tenants"]

    @admin.display(description="آخر يوم مسموح")
    def last_allowed_display(self, obj):
        return obj.last_allowed_date

    @admin.display(description="حالة المنشأة")
    def tenant_status(self, obj):
        return obj.tenant.get_status_display()

    @admin.action(description="تمديد 30 يوماً من اليوم أو من نهاية الاشتراك")
    def renew_30_days(self, request, queryset):
        from saas.subscription_policy import evaluate_tenant_subscription, renew_subscription

        for sub in queryset.select_related("tenant"):
            renew_subscription(sub.tenant, days=30)
            sub.refresh_from_db(fields=["ends_at"])
            evaluate_tenant_subscription(sub.tenant)
            self.message_user(
                request,
                f"{sub.tenant.slug}: حتى {sub.last_allowed_date}",
                messages.SUCCESS,
            )

    @admin.action(description="تفعيل المنشأة إن كان الاشتراك سارياً")
    def activate_tenants(self, request, queryset):
        from saas.subscription_policy import evaluate_tenant_subscription

        for sub in queryset.select_related("tenant"):
            result = evaluate_tenant_subscription(sub.tenant)
            if result == "activated":
                self.message_user(
                    request, f"تم تفعيل {sub.tenant.slug}.", messages.SUCCESS
                )
            elif sub.tenant.status == Tenant.Status.FROZEN:
                self.message_user(
                    request,
                    f"{sub.tenant.slug}: ما زال مجمداً — مدّد ends_at إلى تاريخ مستقبلي.",
                    messages.WARNING,
                )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        from saas.subscription_policy import evaluate_tenant_subscription

        result = evaluate_tenant_subscription(obj.tenant)
        obj.tenant.refresh_from_db(fields=["status"])
        if result == "frozen":
            self.message_user(
                request,
                f"تم تجميد «{obj.tenant.name}» — آخر يوم مسموح: {obj.last_allowed_date}. "
                f"مدّد «ends_at» إلى تاريخ بعد اليوم.",
                messages.WARNING,
            )
        elif result == "activated":
            self.message_user(
                request,
                f"تم تفعيل «{obj.tenant.name}» — الاشتراك ساري حتى {obj.last_allowed_date}.",
                messages.SUCCESS,
            )


@admin.register(GlobalUsername)
class GlobalUsernameAdmin(admin.ModelAdmin):
    list_display = ("username", "tenant", "created_at")
    search_fields = ("username", "tenant__slug")


@admin.register(PaymentRecord)
class PaymentRecordAdmin(admin.ModelAdmin):
    form = PaymentRecordForm
    change_form_template = "admin/saas/paymentrecord/change_form.html"
    list_display = (
        "tenant",
        "renewal_months",
        "amount",
        "method",
        "paid_at",
        "reference",
    )
    list_filter = ("method", "paid_at")
    search_fields = ("tenant__name", "tenant__slug", "reference", "notes")
    date_hierarchy = "paid_at"
    ordering = ("-paid_at",)
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "tenant",
                    "renewal_months",
                    "amount",
                    "method",
                    "reference",
                    "paid_at",
                    "notes",
                ),
            },
        ),
    )

    def render_change_form(self, request, context, *args, **kwargs):
        from django.urls import reverse

        context["ma7aly_billing_url_template"] = reverse(
            "admin:saas_payment_tenant_billing",
            args=["00000000-0000-0000-0000-000000000000"],
        )
        return super().render_change_form(request, context, *args, **kwargs)

    def get_urls(self):
        from django.urls import path

        custom = [
            path(
                "tenant-billing/<uuid:tenant_id>/",
                self.admin_site.admin_view(self.tenant_billing_view),
                name="saas_payment_tenant_billing",
            ),
        ]
        return custom + super().get_urls()

    def tenant_billing_view(self, request, tenant_id):
        from django.http import JsonResponse
        from django.shortcuts import get_object_or_404

        from saas.billing import get_tenant_billing_payload

        tenant = get_object_or_404(
            Tenant.objects.select_related("plan"), pk=tenant_id
        )
        try:
            months = int(request.GET.get("months", 1))
        except (TypeError, ValueError):
            months = 1
        return JsonResponse(get_tenant_billing_payload(tenant, months))

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change:
            return

        from saas.subscription_policy import (
            evaluate_tenant_subscription,
            extend_subscription_months,
        )

        months = form.cleaned_data.get("renewal_months") or obj.renewal_months or 1
        sub = extend_subscription_months(obj.tenant, months)
        if sub:
            evaluate_tenant_subscription(obj.tenant)
            obj.tenant.refresh_from_db(fields=["status"])
            self.message_user(
                request,
                f"تم تمديد اشتراك «{obj.tenant.name}» {months} شهر/شهور — "
                f"ينتهي في {sub.ends_at} (آخر يوم مسموح: {sub.last_allowed_date}).",
                messages.SUCCESS,
            )
        else:
            self.message_user(
                request,
                f"تم حفظ الدفعة، لكن لا يوجد اشتراك حالي لـ «{obj.tenant.name}» "
                "لتمديده — أنشئ اشتراكاً من صفحة المنشأة أولاً.",
                messages.WARNING,
            )
