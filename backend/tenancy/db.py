from __future__ import annotations

import re
import secrets
import string

from django.conf import settings
from django.db import connections

from saas.models import Tenant

TENANT_DB_ALIAS = "tenant"


def _admin_cfg() -> dict:
    return settings.DATABASES["default"]


def _postgres_admin_connection():
    import psycopg2

    cfg = _admin_cfg()
    return psycopg2.connect(
        dbname="postgres",
        user=cfg["USER"],
        password=cfg["PASSWORD"],
        host=cfg["HOST"],
        port=cfg["PORT"],
    )


def sanitize_pg_role_name(slug: str, *, suffix: str = "") -> str:
    """اسم دور PostgreSQL آمن (حروف صغيرة وأرقام و _)."""
    clean = re.sub(r"[^a-z0-9_]", "_", slug.lower())
    clean = re.sub(r"_+", "_", clean).strip("_")
    if not clean or not clean[0].isalpha():
        clean = f"t_{clean}" if clean else "tenant"
    name = f"mahaly_{clean[:50]}"
    if suffix:
        name = f"{name}_{suffix}"[:63]
    return name[:63]


def generate_db_password(length: int = 24) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_tenant_db_credentials(tenant: Tenant) -> tuple[str, str]:
    """يولّد اسم دور وباسورد فريدين للمنشأة."""
    for attempt in range(8):
        suffix = "" if attempt == 0 else str(attempt)
        user = sanitize_pg_role_name(tenant.slug, suffix=suffix)
        if not Tenant.objects.filter(db_user=user).exclude(pk=tenant.pk).exists():
            return user, generate_db_password()
    raise RuntimeError(f"تعذر إنشاء اسم دور PostgreSQL فريد لـ {tenant.slug}")


def tenant_db_config(tenant: Tenant) -> dict:
    base = _admin_cfg().copy()
    base["NAME"] = tenant.db_name
    if tenant.db_user and tenant.db_password_encrypted:
        base["USER"] = tenant.db_user
        base["PASSWORD"] = tenant.get_db_password()
    return base


def register_tenant_connection(tenant: Tenant) -> str:
    config = tenant_db_config(tenant)
    connections.databases[TENANT_DB_ALIAS] = config
    if TENANT_DB_ALIAS in connections:
        conn = connections[TENANT_DB_ALIAS]
        conn.close()
        # Django caches connection objects per alias. Updating only
        # connections.databases is not enough once the alias has been used.
        conn.settings_dict = config
    return TENANT_DB_ALIAS


def _role_exists(cursor, role: str) -> bool:
    cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", [role])
    return cursor.fetchone() is not None


def _database_exists(cursor, db_name: str) -> bool:
    cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", [db_name])
    return cursor.fetchone() is not None


def _grant_database(cursor, db_name: str, db_user: str) -> None:
    from psycopg2 import sql

    cursor.execute(
        sql.SQL("GRANT ALL PRIVILEGES ON DATABASE {} TO {}").format(
            sql.Identifier(db_name),
            sql.Identifier(db_user),
        )
    )


def _grant_schema_privileges(db_name: str, db_user: str) -> None:
    import psycopg2
    from psycopg2 import sql

    cfg = _admin_cfg()
    conn = psycopg2.connect(
        dbname=db_name,
        user=cfg["USER"],
        password=cfg["PASSWORD"],
        host=cfg["HOST"],
        port=cfg["PORT"],
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL("GRANT ALL ON SCHEMA public TO {}").format(sql.Identifier(db_user))
            )
            cur.execute(
                sql.SQL(
                    "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {}"
                ).format(sql.Identifier(db_user))
            )
            cur.execute(
                sql.SQL(
                    "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {}"
                ).format(sql.Identifier(db_user))
            )
            cur.execute(
                sql.SQL(
                    "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
                    "GRANT ALL ON TABLES TO {}"
                ).format(sql.Identifier(db_user))
            )
            cur.execute(
                sql.SQL(
                    "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
                    "GRANT ALL ON SEQUENCES TO {}"
                ).format(sql.Identifier(db_user))
            )
        conn.commit()
    finally:
        conn.close()


def create_postgres_tenant_database(tenant: Tenant) -> None:
    """
    ينشئ دور PostgreSQL بباسورد خاص + قاعدة بيانات مملوكة له.
    يتطلب أن يكون مستخدم MainClothes (DB_USER) لديه CREATEROLE و CREATEDB.
    """
    from psycopg2 import sql

    if not tenant.db_user or not tenant.db_password_encrypted:
        raise ValueError("يجب استدعاء ensure_db_credentials قبل إنشاء قاعدة البيانات.")

    db_name = tenant.db_name
    db_user = tenant.db_user
    db_password = tenant.get_db_password()

    conn = _postgres_admin_connection()
    conn.set_isolation_level(0)  # autocommit — مطلوب لـ CREATE DATABASE
    try:
        with conn.cursor() as cur:
            if not _role_exists(cur, db_user):
                cur.execute(
                    sql.SQL("CREATE ROLE {} WITH LOGIN PASSWORD %s").format(
                        sql.Identifier(db_user)
                    ),
                    [db_password],
                )

            if not _database_exists(cur, db_name):
                cur.execute(
                    sql.SQL("CREATE DATABASE {} ENCODING 'UTF8' OWNER {}").format(
                        sql.Identifier(db_name),
                        sql.Identifier(db_user),
                    )
                )
            else:
                cur.execute(
                    sql.SQL("ALTER DATABASE {} OWNER TO {}").format(
                        sql.Identifier(db_name),
                        sql.Identifier(db_user),
                    )
                )
                _grant_database(cur, db_name, db_user)
    finally:
        conn.close()

    _grant_schema_privileges(db_name, db_user)


def create_postgres_database(db_name: str) -> None:
    """للتوافق القديم — إنشاء قاعدة فقط بحساب المنصة (بدون دور منفصل)."""
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    cfg = _admin_cfg()
    conn = psycopg2.connect(
        dbname="postgres",
        user=cfg["USER"],
        password=cfg["PASSWORD"],
        host=cfg["HOST"],
        port=cfg["PORT"],
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", [db_name])
            if cursor.fetchone():
                return
            cursor.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        conn.close()
