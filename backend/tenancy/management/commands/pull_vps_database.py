"""استيراد منصة VPS + بيانات المنشآت عبر Django Admin و REST API."""
from __future__ import annotations

import json
import re
import ssl
import http.cookiejar
import urllib.error
import urllib.parse
import urllib.request
from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from erp.models import Branch, Season, User
from saas.models import GlobalUsername, Plan, Subscription, Tenant
from tenancy.context import set_current_tenant
from tenancy.services import ensure_tenant_connection, provision_tenant_database


def _drop_tenant_database(db_name: str) -> None:
    from django.conf import settings
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    cfg = settings.DATABASES["default"]
    conn = psycopg2.connect(
        dbname="postgres",
        user=cfg["USER"],
        password=cfg["PASSWORD"],
        host=cfg["HOST"],
        port=cfg["PORT"],
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()",
            [db_name],
        )
        cursor.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
    conn.close()


def _http_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: dict | None = None,
    cookies: dict[str, str] | None = None,
) -> tuple[int, Any, dict[str, str]]:
    data = None
    req_headers = dict(headers or {})
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req_headers.setdefault("Content-Type", "application/json")
    if cookies:
        req_headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in cookies.items())
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            resp_headers = {k.lower(): v for k, v in resp.headers.items()}
            if "set-cookie" in resp_headers:
                for part in resp_headers["set-cookie"].split(","):
                    if "=" in part:
                        name, val = part.split("=", 1)
                        name = name.strip().split()[-1]
                        cookies[name] = val.split(";")[0]
            if not raw:
                return resp.status, None, cookies or {}
            try:
                return resp.status, json.loads(raw), cookies or {}
            except json.JSONDecodeError:
                return resp.status, raw, cookies or {}
    except urllib.error.HTTPError as exc:
        try:
            raw = exc.read().decode("utf-8", errors="replace")
        except Exception:
            raw = str(exc)
        try:
            payload = json.loads(raw) if raw else {"detail": raw}
        except json.JSONDecodeError:
            payload = {"detail": raw}
        return exc.code, payload, cookies or {}


def _readonly_field(html: str, field: str) -> str:
    m = re.search(
        rf'class="form-group field-{re.escape(field)}".*?<div class="readonly">([^<]*)</div>',
        html,
        re.S,
    )
    return (m.group(1).strip() if m else "")


def _input_value(html: str, field: str) -> str:
    patterns = [
        rf'id="id_{re.escape(field)}"[^>]*value="([^"]*)"',
        rf'value="([^"]*)"[^>]*id="id_{re.escape(field)}"',
        rf'name="{re.escape(field)}"[^>]*value="([^"]*)"',
    ]
    for pattern in patterns:
        m = re.search(pattern, html)
        if m:
            return m.group(1).strip()
    return ""


def _selected_modules(html: str) -> list[str]:
    return re.findall(r'name="modules" value="([^"]+)"[^>]*checked', html)


def _fetch_all_pages(base_url: str, path: str, headers: dict[str, str]) -> list[dict]:
    items: list[dict] = []
    url = f"{base_url.rstrip('/')}/api/v1/{path.lstrip('/')}"
    if "?" not in url:
        url += "?page_size=200"
    while url:
        status, data, _ = _http_json(url, headers=headers)
        if status >= 400:
            break
        if isinstance(data, list):
            items.extend(data)
            break
        if isinstance(data, dict):
            items.extend(data.get("results") or [])
            next_url = data.get("next")
            url = next_url if next_url else ""
        else:
            break
    return items


class Command(BaseCommand):
    help = "سحب قاعدة بيانات VPS (MainClothes + منشآت) إلى PostgreSQL المحلي"

    def add_arguments(self, parser):
        parser.add_argument("--vps-url", default="http://128.140.127.179:8788")
        parser.add_argument("--admin-user", default="admin")
        parser.add_argument("--admin-password", default="Ma7aly@Admin2026")
        parser.add_argument("--skip-reset", action="store_true")
        parser.add_argument("--tenant", default="", help="Sync only one tenant slug")

    def handle(self, *args, **options):
        vps_url = options["vps_url"].rstrip("/")
        tenants = self._scrape_vps_tenants(
            vps_url, options["admin_user"], options["admin_password"]
        )
        if not tenants:
            raise CommandError("لم يُعثر على منشآت في VPS Admin.")

        if not options["skip_reset"]:
            self.stdout.write("Resetting local MainClothes...")
            self._drop_all_local_tenant_databases()
            call_command("reset_saas_db")
            call_command(
                "seed_platform",
                admin_user="admin",
                admin_pass="admin123",
                admin_email="admin@gmail.com",
            )

        plan = Plan.objects.get(code="starter")
        for meta in tenants:
            if options["tenant"] and meta["slug"] != options["tenant"]:
                continue
            self._provision_local_tenant(meta, plan)
            if meta.get("owner_username") and meta.get("owner_initial_password") and meta.get("owner_username") != "-":
                self._sync_tenant_from_vps(vps_url, meta)
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Skip data sync for {meta['slug']} (missing owner credentials)"
                    )
                )

        self.stdout.write(self.style.SUCCESS("VPS import finished."))

    def _scrape_vps_tenants(self, vps_url: str, user: str, password: str) -> list[dict]:
        jar = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        login_page_url = f"{vps_url}/admin/login/?next=/admin/"
        page_html = opener.open(login_page_url, timeout=60).read().decode("utf-8")
        csrf = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', page_html)
        if not csrf:
            raise CommandError("تعذر قراءة CSRF من VPS Admin.")
        body = urllib.parse.urlencode(
            {
                "username": user,
                "password": password,
                "csrfmiddlewaretoken": csrf.group(1),
                "next": "/admin/",
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            login_page_url,
            data=body,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": login_page_url,
            },
            method="POST",
        )
        opener.open(req, timeout=60).read()

        list_url = f"{vps_url}/admin/saas/tenant/"
        list_html = opener.open(list_url, timeout=60).read().decode("utf-8")
        tenant_ids = list(
            dict.fromkeys(
                re.findall(r"/admin/saas/tenant/([a-f0-9-]+)/change/", list_html)
            )
        )

        tenants: list[dict] = []
        for tenant_id in tenant_ids:
            change_url = f"{vps_url}/admin/saas/tenant/{tenant_id}/change/"
            html = opener.open(change_url, timeout=60).read().decode("utf-8")
            slug = _input_value(html, "slug")
            db_name = _readonly_field(html, "db_name")
            if not slug:
                continue
            tenants.append(
                {
                    "slug": slug,
                    "name": _input_value(html, "name") or slug,
                    "owner_username": _readonly_field(html, "owner_username"),
                    "owner_initial_password": _readonly_field(html, "owner_initial_password"),
                    "db_name": _readonly_field(html, "db_name"),
                    "db_user": _readonly_field(html, "db_user"),
                    "modules": _selected_modules(html),
                }
            )
            self.stdout.write(f"  VPS tenant: {slug} ({_readonly_field(html, 'db_name')})")
        return tenants

    def _drop_all_local_tenant_databases(self) -> None:
        from django.conf import settings
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

        cfg = settings.DATABASES["default"]
        conn = psycopg2.connect(
            dbname="postgres",
            user=cfg["USER"],
            password=cfg["PASSWORD"],
            host=cfg["HOST"],
            port=cfg["PORT"],
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT datname FROM pg_database WHERE datname LIKE %s",
                [f"{settings.TENANT_DB_PREFIX}%"],
            )
            for (db_name,) in cursor.fetchall():
                _drop_tenant_database(db_name)
            cursor.execute("SELECT rolname FROM pg_roles WHERE rolname LIKE 'mahaly_%'")
            for (role_name,) in cursor.fetchall():
                cursor.execute(f'DROP ROLE IF EXISTS "{role_name}"')
        conn.close()

    def _provision_local_tenant(self, meta: dict, plan: Plan) -> Tenant:
        slug = meta["slug"].lower()
        tenant, created = Tenant.objects.get_or_create(
            slug=slug,
            defaults={
                "name": meta["name"] or slug,
                "plan": plan,
                "status": Tenant.Status.PROVISIONING,
            },
        )
        tenant.name = meta["name"] or tenant.name
        tenant.modules = meta.get("modules") or tenant.modules
        tenant.owner_username = meta.get("owner_username") or ""
        tenant.owner_initial_password = meta.get("owner_initial_password") or ""
        tenant.status = Tenant.Status.PROVISIONING
        tenant.save()

        if created or not tenant.db_user:
            _drop_tenant_database(tenant.db_name or f"mahaly_t_{slug}")
            provision_tenant_database(tenant)
        tenant.status = Tenant.Status.ACTIVE
        tenant.save(update_fields=["status", "updated_at", "modules", "owner_username", "owner_initial_password"])

        Subscription.objects.filter(tenant=tenant, is_current=True).update(is_current=False)
        Subscription.objects.create(
            tenant=tenant,
            plan=plan,
            starts_at=timezone.localdate(),
            ends_at=timezone.localdate() + timedelta(days=365),
            is_current=True,
        )

        owner = meta.get("owner_username", "").lower()
        password = meta.get("owner_initial_password") or ""
        if owner and password and owner != "-":
            ensure_tenant_connection(tenant)
            set_current_tenant(tenant)
            from erp.services import branches as branch_service

            branch, _ = Branch.objects.using("tenant").get_or_create(
                code="main",
                defaults={"name_ar": "الفرع الرئيسي", "name_en": "Main Branch"},
            )
            branch_service.ensure_branch_sale_warehouse(branch)
            Season.objects.using("tenant").get_or_create(
                code="current",
                defaults={
                    "name_ar": "الموسم الحالي",
                    "name_en": "Current Season",
                    "is_open": True,
                    "is_current": True,
                },
            )
            if not User.objects.using("tenant").filter(username=owner).exists():
                User._default_manager.db_manager("tenant").create_user(
                    username=owner,
                    password=password,
                    full_name=meta.get("name") or owner,
                    default_branch=branch,
                    is_owner=True,
                )
            else:
                user = User.objects.using("tenant").get(username=owner)
                user.is_owner = True
                user.set_password(password)
                user.default_branch = branch
                user.save(using="tenant", update_fields=["is_owner", "password", "default_branch", "updated_at"])
            GlobalUsername.objects.update_or_create(
                username=owner,
                defaults={"tenant": tenant},
            )
        self.stdout.write(self.style.SUCCESS(f"Local tenant ready: {slug}"))
        return tenant

    def _sync_tenant_from_vps(self, vps_url: str, meta: dict) -> None:
        slug = meta["slug"]
        owner = meta["owner_username"].lower()
        password = meta["owner_initial_password"]
        self.stdout.write(f"Syncing {slug} from VPS API...")

        status, login, _ = _http_json(
            f"{vps_url}/api/v1/auth/login/",
            method="POST",
            headers={"X-Tenant-Slug": slug},
            body={"username": owner, "password": password},
        )
        if status >= 400:
            self.stdout.write(self.style.WARNING(f"  VPS API login failed for {slug}: {login}"))
            return

        vps_headers = {
            "Authorization": f"Bearer {login['access']}",
            "X-Tenant-Slug": slug,
        }
        status, local_login, _ = _http_json(
            "http://127.0.0.1:8000/api/v1/auth/login/",
            method="POST",
            headers={"X-Tenant-Slug": slug},
            body={"username": owner, "password": password},
        )
        if status >= 400:
            self.stdout.write(self.style.WARNING(f"  Local API login failed for {slug}: {local_login}"))
            return
        local_headers = {
            "Authorization": f"Bearer {local_login['access']}",
            "X-Tenant-Slug": slug,
        }

        id_map: dict[str, dict[str, str]] = {}
        catalog_paths = [
            ("supplier_types", "inventory/supplier-types/"),
            ("supplier_groups", "inventory/supplier-groups/"),
            ("brands", "inventory/brands/"),
            ("sections", "inventory/sections/"),
            ("classifications", "inventory/classifications/"),
            ("sizes", "inventory/sizes/"),
            ("colors", "inventory/colors/"),
            ("customers", "inventory/customers/"),
        ]
        for key, path in catalog_paths:
            id_map[key] = self._sync_catalog_by_code(
                vps_url, path, vps_headers, local_headers
            )
        id_map["suppliers"] = self._sync_suppliers(
            vps_url, vps_headers, local_headers, id_map
        )

        existing_product_codes = {
            row.get("code")
            for row in _fetch_all_pages("http://127.0.0.1:8000", "inventory/products/", local_headers)
            if row.get("code")
        }

        branches = _fetch_all_pages(vps_url, "organization/branches/", vps_headers)
        branch_map: dict[str, str] = {}
        for row in branches:
            code = row.get("code") or "main"
            payload = {
                "code": code,
                "name_ar": row.get("name_ar") or code,
                "name_en": row.get("name_en") or code,
                "is_active": row.get("is_active", True),
            }
            st, created, _ = _http_json(
                "http://127.0.0.1:8000/api/v1/organization/branches/",
                method="POST",
                headers=local_headers,
                body=payload,
            )
            if st < 400 and isinstance(created, dict):
                branch_map[str(row["id"])] = created["id"]
            else:
                existing = _fetch_all_pages("http://127.0.0.1:8000", "organization/branches/", local_headers)
                for item in existing:
                    if item.get("code") == code:
                        branch_map[str(row["id"])] = item["id"]
                        break

        seasons = _fetch_all_pages(vps_url, "organization/seasons/", vps_headers)
        season_map: dict[str, str] = {}
        for row in seasons:
            code = row.get("code") or "season"
            payload = {
                "code": code,
                "name_ar": row.get("name_ar") or code,
                "name_en": row.get("name_en") or code,
                "is_open": row.get("is_open", True),
                "is_current": row.get("is_current", False),
            }
            st, created, _ = _http_json(
                "http://127.0.0.1:8000/api/v1/organization/seasons/",
                method="POST",
                headers=local_headers,
                body=payload,
            )
            if st < 400 and isinstance(created, dict):
                season_map[str(row["id"])] = created["id"]

        products = _fetch_all_pages(vps_url, "inventory/products/", vps_headers)
        synced_products = 0
        for row in products:
            code = row.get("code")
            if code and code in existing_product_codes:
                continue
            payload = {
                "code": row.get("code"),
                "barcode": row.get("barcode") or "",
                "name_ar": row.get("name_ar") or row.get("code") or "منتج",
                "name_en": row.get("name_en") or "",
                "description": row.get("description") or "",
                "purchase_price": str(row.get("purchase_price") or "0"),
                "markup_percent": str(row.get("markup_percent") or "0"),
                "offer_price": row.get("offer_price"),
            }
            for fk, bucket in (
                ("brand", "brands"),
                ("section", "sections"),
                ("classification", "classifications"),
                ("supplier", "suppliers"),
                ("season", "seasons"),
            ):
                old = row.get(fk)
                if old and str(old) in (season_map if fk == "season" else id_map[bucket]):
                    payload[fk] = (season_map if fk == "season" else id_map[bucket])[str(old)]
            size_ids = []
            color_ids = []
            for variant in row.get("variants") or []:
                sz = variant.get("size")
                cl = variant.get("color")
                if sz and str(sz) in id_map["sizes"]:
                    size_ids.append(id_map["sizes"][str(sz)])
                if cl and str(cl) in id_map["colors"]:
                    color_ids.append(id_map["colors"][str(cl)])
            if size_ids:
                payload["size_ids"] = list(dict.fromkeys(size_ids))
            if color_ids:
                payload["color_ids"] = list(dict.fromkeys(color_ids))

            st, _, _ = _http_json(
                "http://127.0.0.1:8000/api/v1/inventory/products/",
                method="POST",
                headers=local_headers,
                body=payload,
            )
            if st < 400:
                synced_products += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"  {slug}: products={synced_products}, suppliers={len(id_map['suppliers'])}, customers={len(id_map['customers'])}"
            )
        )

    def _sync_catalog_by_code(
        self,
        vps_url: str,
        path: str,
        vps_headers: dict[str, str],
        local_headers: dict[str, str],
    ) -> dict[str, str]:
        mapping: dict[str, str] = {}
        rows = _fetch_all_pages(vps_url, path, vps_headers)
        allowed_by_path = {
            "inventory/supplier-types/": {
                "code", "name_ar", "name_en", "description", "entity_kind", "is_active",
            },
            "inventory/supplier-groups/": {
                "code", "name_ar", "name_en", "description", "settlement_mode", "is_active",
            },
            "inventory/brands/": {"code", "name_ar", "name_en", "description", "is_active"},
            "inventory/sections/": {"code", "name_ar", "name_en", "description", "is_active"},
            "inventory/classifications/": {"code", "name_ar", "name_en", "description", "is_active"},
            "inventory/sizes/": {"code", "name_ar", "name_en", "description", "is_active"},
            "inventory/colors/": {"code", "name_ar", "name_en", "description", "is_active"},
            "inventory/suppliers/": {
                "code", "name_ar", "name_en", "contact_name", "contact_title",
                "phone", "whatsapp", "weekly_inventory_day", "is_also_customer", "notes", "is_active",
            },
            "inventory/customers/": {
                "code", "name_ar", "name_en", "phone", "whatsapp", "email", "address", "notes", "is_active",
            },
        }
        allowed = allowed_by_path.get(path, {"code", "name_ar", "name_en", "description", "is_active"})
        for row in rows:
            code = row.get("code")
            if not code:
                continue
            payload = {k: v for k, v in row.items() if k in allowed and v is not None}
            if "is_active" not in payload:
                payload["is_active"] = True
            st, created, _ = _http_json(
                f"http://127.0.0.1:8000/api/v1/{path}",
                method="POST",
                headers=local_headers,
                body=payload,
            )
            if st < 400 and isinstance(created, dict):
                mapping[str(row["id"])] = created["id"]
                continue
            existing = _fetch_all_pages("http://127.0.0.1:8000", path, local_headers)
            for item in existing:
                if item.get("code") == code:
                    mapping[str(row["id"])] = item["id"]
                    break
        return mapping

    def _sync_suppliers(
        self,
        vps_url: str,
        vps_headers: dict[str, str],
        local_headers: dict[str, str],
        id_map: dict[str, dict[str, str]],
    ) -> dict[str, str]:
        mapping: dict[str, str] = {}
        rows = _fetch_all_pages(vps_url, "inventory/suppliers/", vps_headers)
        existing = {
            item.get("code"): item.get("id")
            for item in _fetch_all_pages("http://127.0.0.1:8000", "inventory/suppliers/", local_headers)
            if item.get("code")
        }
        for row in rows:
            code = row.get("code")
            if not code:
                continue
            if code in existing:
                old_type = row.get("supplier_type")
                old_group = row.get("supplier_group")
                if old_type and str(old_type) in id_map["supplier_types"]:
                    pass
                mapping[str(row["id"])] = existing[code]
                continue
            payload = {
                "code": code,
                "name_ar": row.get("name_ar") or code,
                "name_en": row.get("name_en") or "",
                "contact_name": row.get("contact_name") or "",
                "contact_title": row.get("contact_title") or "",
                "phone": row.get("phone") or "",
                "whatsapp": row.get("whatsapp") or "",
                "weekly_inventory_day": row.get("weekly_inventory_day") or "",
                "is_also_customer": row.get("is_also_customer", False),
                "notes": row.get("notes") or "",
                "is_active": row.get("is_active", True),
            }
            old_type = row.get("supplier_type")
            old_group = row.get("supplier_group")
            if old_type and str(old_type) in id_map["supplier_types"]:
                payload["supplier_type"] = id_map["supplier_types"][str(old_type)]
            if old_group and str(old_group) in id_map["supplier_groups"]:
                payload["supplier_group"] = id_map["supplier_groups"][str(old_group)]
            if "supplier_type" not in payload or "supplier_group" not in payload:
                local_types = _fetch_all_pages("http://127.0.0.1:8000", "inventory/supplier-types/", local_headers)
                local_groups = _fetch_all_pages("http://127.0.0.1:8000", "inventory/supplier-groups/", local_headers)
                if local_types:
                    payload.setdefault("supplier_type", local_types[0]["id"])
                if local_groups:
                    payload.setdefault("supplier_group", local_groups[0]["id"])
            st, created, _ = _http_json(
                "http://127.0.0.1:8000/api/v1/inventory/suppliers/",
                method="POST",
                headers=local_headers,
                body=payload,
            )
            if st < 400 and isinstance(created, dict):
                mapping[str(row["id"])] = created["id"]
                existing[code] = created["id"]
        return mapping
