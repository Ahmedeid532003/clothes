from tenancy.context import get_current_tenant

TENANT_DB_ALIAS = "tenant"
# قاعدة المنصة (MainClothes)
PLATFORM_APP_LABELS = {"saas", "admin", "auth", "contenttypes", "sessions"}
# قاعدة كل محل
TENANT_APP_LABELS = {"erp"}


class TenantRouter:
    def db_for_read(self, model, **hints):
        return self._route(model)

    def db_for_write(self, model, **hints):
        return self._route(model)

    def allow_relation(self, obj1, obj2, **hints):
        db1 = self._route(obj1._meta.model)
        db2 = self._route(obj2._meta.model)
        if db1 and db2:
            return db1 == db2
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label in PLATFORM_APP_LABELS:
            return db == "default"
        if app_label in TENANT_APP_LABELS:
            return db == TENANT_DB_ALIAS
        return False

    def _route(self, model):
        if model._meta.app_label in PLATFORM_APP_LABELS:
            return "default"
        if model._meta.app_label in TENANT_APP_LABELS:
            if get_current_tenant():
                return TENANT_DB_ALIAS
            # منع كتابة/قراءة ERP على MainClothes بدون tenant
            return TENANT_DB_ALIAS
        return "default"
