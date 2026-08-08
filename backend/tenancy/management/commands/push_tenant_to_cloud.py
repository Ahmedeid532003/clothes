"""نسخ منشأة كاملة من PostgreSQL المحلي (MainClothes + mahaly_t_*) إلى Neon/Fly."""
from __future__ import annotations

import os
import subprocess
import tempfile
from urllib.parse import urlparse

import psycopg2
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from psycopg2 import sql
from psycopg2.extras import Json, execute_batch

JSONB_COLUMNS = {
    ("saas_tenant", "modules"),
}


def _adapt_row(table: str, cols: list[str], row: tuple) -> tuple:
    out = list(row)
    for i, col in enumerate(cols):
        if (table, col) in JSONB_COLUMNS and isinstance(out[i], list):
            out[i] = Json(out[i])
    return tuple(out)

PG_BIN = r"C:\Program Files\PostgreSQL\16\bin"


def _connect_url(url: str):
    return psycopg2.connect(url)


def _connect_local_db(db_name: str):
    cfg = settings.DATABASES["default"]
    return psycopg2.connect(
        dbname=db_name,
        user=cfg["USER"],
        password=cfg["PASSWORD"],
        host=cfg["HOST"],
        port=cfg["PORT"],
    )


def _list_public_tables(conn) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename NOT LIKE 'pg_%'
            ORDER BY tablename
            """
        )
        return [row[0] for row in cur.fetchall()]


def _pg_env(password: str) -> dict[str, str]:
    env = os.environ.copy()
    env["PGPASSWORD"] = password
    return env


def _dump_tenant_data(tenant_db: str, dump_path: str) -> None:
    cfg = settings.DATABASES["default"]
    pg_dump = os.path.join(PG_BIN, "pg_dump.exe")
    if not os.path.isfile(pg_dump):
        raise CommandError(f"pg_dump not found: {pg_dump}")

    cmd = [
        pg_dump,
        "-h",
        str(cfg["HOST"]),
        "-p",
        str(cfg["PORT"]),
        "-U",
        str(cfg["USER"]),
        "-d",
        tenant_db,
        "--data-only",
        "--no-owner",
        "--no-privileges",
        "--exclude-table=django_migrations",
        "-f",
        dump_path,
    ]
    subprocess.run(cmd, env=_pg_env(cfg["PASSWORD"]), check=True)


def _restore_to_cloud(cloud_url: str, dump_path: str) -> None:
    psql = os.path.join(PG_BIN, "psql.exe")
    if not os.path.isfile(psql):
        raise CommandError(f"psql not found: {psql}")

    parsed = urlparse(cloud_url)
    env = os.environ.copy()
    env["PGHOST"] = parsed.hostname or ""
    env["PGPORT"] = str(parsed.port or 5432)
    env["PGUSER"] = parsed.username or ""
    env["PGPASSWORD"] = parsed.password or ""
    env["PGDATABASE"] = parsed.path.lstrip("/").split("?")[0]
    env["PGSSLMODE"] = "require"

    subprocess.run(
        [psql, "-v", "ON_ERROR_STOP=1", "-f", dump_path],
        env=env,
        check=True,
    )


class Command(BaseCommand):
    help = "رفع منشأة من PostgreSQL المحلي إلى قاعدة Fly/Neon (CLOUD_SHARED_DB)"

    def add_arguments(self, parser):
        parser.add_argument("--slug", default="eid", help="كود المنشأة (مثل eid)")
        parser.add_argument(
            "--cloud-database-url",
            default="",
            help="DATABASE_URL لـ Neon (أو CLOUD_DATABASE_URL في البيئة)",
        )
        parser.add_argument(
            "--keep-other-tenants",
            action="store_true",
            help="لا تحذف منشآت SaaS الأخرى على السحابة",
        )

    def handle(self, *args, **options):
        if os.environ.get("DATABASE_URL", "").strip():
            raise CommandError(
                "أوقف DATABASE_URL محلياً (استخدم PostgreSQL القديم MainClothes)."
            )

        slug = options["slug"].strip().lower()
        cloud_url = (
            options["cloud_database_url"].strip()
            or os.environ.get("CLOUD_DATABASE_URL", "").strip()
        )
        if not cloud_url:
            raise CommandError(
                "مطلوب --cloud-database-url أو متغير CLOUD_DATABASE_URL"
            )

        saas_db = settings.DATABASES["default"]["NAME"]
        tenant_db = f"{settings.TENANT_DB_PREFIX}{slug}"

        self.stdout.write(f"Local SaaS DB : {saas_db}")
        self.stdout.write(f"Local tenant DB: {tenant_db}")

        try:
            local_saas = _connect_local_db(saas_db)
            local_tenant = _connect_local_db(tenant_db)
        except Exception as exc:
            raise CommandError(
                f"تعذر الاتصال بـ PostgreSQL المحلي.\n{exc}"
            ) from exc

        cloud = _connect_url(cloud_url)
        total_erp = 0

        try:
            with local_saas.cursor() as cur:
                cur.execute(
                    "SELECT id FROM saas_tenant WHERE slug = %s",
                    [slug],
                )
                row = cur.fetchone()
                if not row:
                    raise CommandError(f"المنشأة '{slug}' غير موجودة في {saas_db}.")
                tenant_id = row[0]

                cur.execute(
                    "SELECT username FROM saas_globalusername WHERE tenant_id = %s",
                    [tenant_id],
                )
                global_users = [r[0] for r in cur.fetchall()]

            self.stdout.write(self.style.SUCCESS(f"Found local tenant: {slug}"))

            local_erp_tables = [
                t
                for t in _list_public_tables(local_tenant)
                if not t.startswith("django_migrations")
            ]
            cloud_erp_tables = [
                t
                for t in _list_public_tables(cloud)
                if t.startswith("erp_")
            ]
            erp_tables = [t for t in local_erp_tables if t in cloud_erp_tables]

            with cloud.cursor() as cur:
                if not options["keep_other_tenants"]:
                    cur.execute("DELETE FROM saas_globalusername")
                    cur.execute("DELETE FROM saas_subscription")
                    cur.execute("DELETE FROM saas_tenant")
                else:
                    cur.execute(
                        "DELETE FROM saas_globalusername WHERE tenant_id = %s",
                        [tenant_id],
                    )
                    cur.execute(
                        "DELETE FROM saas_subscription WHERE tenant_id = %s",
                        [tenant_id],
                    )
                    cur.execute("DELETE FROM saas_tenant WHERE slug = %s", [slug])

                if erp_tables:
                    cur.execute(
                        sql.SQL("TRUNCATE {} RESTART IDENTITY CASCADE").format(
                            sql.SQL(", ").join(sql.Identifier(t) for t in erp_tables)
                        )
                    )
            cloud.commit()

            self.stdout.write("Copying SaaS metadata...")
            _copy_table(local_saas, cloud, "saas_plan")
            _copy_table_filtered(local_saas, cloud, "saas_tenant", "slug = %s", [slug])
            _copy_table_filtered(
                local_saas, cloud, "saas_subscription", "tenant_id = %s", [tenant_id]
            )
            for username in global_users:
                _copy_table_filtered(
                    local_saas,
                    cloud,
                    "saas_globalusername",
                    "username = %s",
                    [username],
                )
            cloud.commit()

            self.stdout.write(f"Dumping {len(erp_tables)} ERP tables via pg_dump...")
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".sql", delete=False, encoding="utf-8"
            ) as tmp:
                dump_path = tmp.name
            try:
                _dump_tenant_data(tenant_db, dump_path)
                size_mb = os.path.getsize(dump_path) / (1024 * 1024)
                self.stdout.write(f"  dump size: {size_mb:.2f} MB")
                _restore_to_cloud(cloud_url, dump_path)
            finally:
                if os.path.exists(dump_path):
                    os.remove(dump_path)

            with cloud.cursor() as cur:
                for table in erp_tables:
                    try:
                        cur.execute(
                            sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table))
                        )
                        total_erp += cur.fetchone()[0]
                    except Exception:
                        cloud.rollback()

                cfg = urlparse(cloud_url)
                db_name = cfg.path.lstrip("/").split("?")[0]
                cur.execute(
                    """
                    UPDATE saas_tenant
                    SET db_name = %s, db_user = %s, status = 'active'
                    WHERE slug = %s
                    """,
                    [db_name, cfg.username or "", slug],
                )
            cloud.commit()

        finally:
            local_saas.close()
            local_tenant.close()
            cloud.close()

        self.stdout.write(self.style.SUCCESS("Cloud import finished."))
        self.stdout.write(f"  Tenant slug : {slug}")
        self.stdout.write(f"  Users       : {len(global_users)} user(s)")
        self.stdout.write(f"  ERP rows    : {total_erp}")
        self.stdout.write("")
        self.stdout.write("Login: https://mahalyerp.pages.dev")


def _copy_table(src, dst, table: str) -> int:
    with src.cursor() as sc, dst.cursor() as dc:
        sc.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table)))
        rows = sc.fetchall()
        dc.execute(sql.SQL("DELETE FROM {}").format(sql.Identifier(table)))
        if not rows:
            dst.commit()
            return 0
        cols = [d[0] for d in sc.description]
        insert = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
            sql.Identifier(table),
            sql.SQL(", ").join(sql.Identifier(c) for c in cols),
            sql.SQL(", ").join(sql.Placeholder() * len(cols)),
        )
        execute_batch(
            dc,
            insert,
            [_adapt_row(table, cols, r) for r in rows],
            page_size=500,
        )
        dst.commit()
        return len(rows)


def _copy_table_filtered(src, dst, table: str, where: str, params: list) -> int:
    with src.cursor() as sc, dst.cursor() as dc:
        sc.execute(f'SELECT * FROM "{table}" WHERE {where}', params)
        rows = sc.fetchall()
        if not rows:
            return 0
        cols = [d[0] for d in sc.description]
        insert = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
            sql.Identifier(table),
            sql.SQL(", ").join(sql.Identifier(c) for c in cols),
            sql.SQL(", ").join(sql.Placeholder() * len(cols)),
        )
        execute_batch(
            dc,
            insert,
            [_adapt_row(table, cols, r) for r in rows],
            page_size=200,
        )
        dst.commit()
        return len(rows)
