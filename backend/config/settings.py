"""
Ma7alyErp — Django settings (local Postgres + Redis, no Docker).
"""
from datetime import timedelta
from pathlib import Path

import environ
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, True),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000", "http://127.0.0.1:3000"]),
    CSRF_TRUSTED_ORIGINS=(list, []),
    DEPLOY_GATE_ENABLED=(bool, False),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env("SECRET_KEY", default="dev-only-change-in-production")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = list(env("ALLOWED_HOSTS"))
_render_host = env("RENDER_EXTERNAL_HOSTNAME", default="")
if _render_host:
    ALLOWED_HOSTS.append(_render_host)
_koyeb_host = env("KOYEB_PUBLIC_DOMAIN", default="")
if _koyeb_host:
    ALLOWED_HOSTS.append(_koyeb_host)

INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
    "core",
    "saas",
    "tenancy",
    "erp",
]

DEPLOY_GATE_ENABLED = env.bool("DEPLOY_GATE_ENABLED", default=False)
DEPLOY_ACCESS_CODE = env("DEPLOY_ACCESS_CODE", default="")

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "core.middleware.deploy_gate.DeployGateMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "tenancy.middleware.TenantMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "saas.context_processors.admin_subscription_notifications",
            ],
        },
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("SAAS_DB_NAME", default="mahaly_saas"),
        "USER": env("DB_USER", default="postgres"),
        "PASSWORD": env("DB_PASSWORD", default="postgres"),
        "HOST": env("DB_HOST", default="127.0.0.1"),
        "PORT": env("DB_PORT", default="5432"),
    },
}
_database_url = env("DATABASE_URL", default="")
if _database_url:
    DATABASES["default"] = env.db("DATABASE_URL")
    DATABASES["default"]["CONN_MAX_AGE"] = 600

DATABASE_ROUTERS = ["tenancy.router.TenantRouter"]

TENANT_DB_PREFIX = env("TENANT_DB_PREFIX", default="mahaly_t_")
# Neon / managed PostgreSQL: قاعدة واحدة مشتركة (بدون CREATE DATABASE)
CLOUD_SHARED_DB = env.bool("CLOUD_SHARED_DB", default=False)
if CLOUD_SHARED_DB:
    DATABASES["tenant"] = DATABASES["default"].copy()

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ar"
TIME_ZONE = "Africa/Cairo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# SaaS super-admin uses Django's built-in User on the default DB.
# Tenant ERP users live in each tenant database (erp.User).
AUTH_USER_MODEL = "auth.User"

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS") or CORS_ALLOWED_ORIGINS
if CLOUD_SHARED_DB:
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^https://.*\.netlify\.app$",
        r"^https://.*\.pages\.dev$",
    ]

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

CORS_ALLOW_HEADERS = (
    *default_headers,
    "x-tenant-slug",
    "x-branch-id",
    "x-mahaly-deploy-key",
)

USE_REDIS = env.bool("USE_REDIS", default=False)
REDIS_URL = env("REDIS_URL", default="redis://127.0.0.1:6379/0")

if USE_REDIS:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "mahaly-local",
        }
    }

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "erp.authentication.TenantJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "core.exceptions.api_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Ma7alyErp API",
    "DESCRIPTION": "SaaS + ERP REST API",
    "VERSION": "1.0.0",
}

# Tenant ERP JWT claims
JWT_TENANT_CLAIM = "tenant_slug"
JWT_BRANCH_CLAIM = "branch_id"

# ── Django Admin (Jazzmin) ─────────────────────────────────────────────
JAZZMIN_SETTINGS = {
    "site_title": "Ma7alyERP",
    "site_header": "Ma7alyERP",
    "site_brand": "Ma7alyERP",
    "welcome_sign": "مرحباً بك في لوحة تحكم المنصة",
    "copyright": "Ma7alyERP",
    "search_model": ["saas.Tenant", "auth.User"],
    "topmenu_links": [
        {"name": "لوحة التحكم", "url": "admin:index"},
        {"name": "API Docs", "url": "/api/docs/", "new_window": True},
    ],
    "show_sidebar": True,
    "navigation_expanded": True,
    "order_with_respect_to": ["saas", "auth"],
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user-shield",
        "auth.group": "fas fa-users",
        "saas.Tenant": "fas fa-store",
        "saas.Plan": "fas fa-tags",
        "saas.Subscription": "fas fa-calendar-check",
        "saas.GlobalUsername": "fas fa-at",
        "saas.PaymentRecord": "fas fa-credit-card",
    },
    "default_icon_parents": "fas fa-folder",
    "default_icon_children": "fas fa-circle",
    "custom_css": "admin/css/ma7aly_admin.css",
    "custom_js": "admin/js/ma7aly_calendar_fix.js",
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
}

# على HTTP (بدون SSL) المتصفح يتجاهل COOP — نوقف التحذير في الكونسول
SECURE_CROSS_ORIGIN_OPENER_POLICY = None

JAZZMIN_UI_TWEAKS = {
    "navbar": "navbar-dark navbar-primary",
    "sidebar": "sidebar-dark-primary",
    "sidebar_fixed": True,
    "navbar_fixed": True,
    "footer_fixed": False,
    "theme": "default",
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success",
    },
}
