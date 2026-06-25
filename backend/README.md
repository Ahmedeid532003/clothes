# Ma7alyErp Backend

Django + DRF + PostgreSQL + Redis (بدون Docker).

## المتطلبات

1. **Python 3.11+**
2. **PostgreSQL** — قاعدة المنصة: `MainClothes` (أو غيّر `SAAS_DB_NAME` في `.env`)
3. **Redis** — يعمل على `127.0.0.1:6379` (خدمة Windows `Redis` — Automatic)

## التثبيت (Windows)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# عدّل DB_PASSWORD في .env
```

### PostgreSQL

```sql
CREATE DATABASE "MainClothes";
```

أو:
```powershell
python manage.py ensure_saas_db
```

## التشغيل الأول

```powershell
python manage.py reset_saas_db
python manage.py seed_platform --admin-user admin --admin-pass admin123 --admin-email admin@gmail.com
python manage.py seed_demo_tenant
python manage.py runserver 8000
```

> `reset_saas_db` للتطوير فقط — يعيد إنشاء قاعدة المنصة من الصفر.

- **Django Admin:** http://127.0.0.1:8000/admin/
- **API Docs:** http://127.0.0.1:8000/api/docs/
- **Health:** http://127.0.0.1:8000/api/v1/health/

## منشأة تجريبية

| | |
|--|--|
| Header | `X-Tenant-Slug: demo` |
| User | `owner@demo` |
| Pass | `demo1234` |

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/auth/login/ `
  -H "Content-Type: application/json" `
  -H "X-Tenant-Slug: demo" `
  -d "{\"username\":\"owner@demo\",\"password\":\"demo1234\"}"
```

## أوامر مفيدة

```powershell
python manage.py audit_tenancy          # فحص فصل MainClothes عن mahaly_t_*
python manage.py cleanup_platform_erp   # حذف بقايا ERP من MainClothes إن وُجدت
python manage.py migrate_tenant --slug demo
python manage.py provision_tenant --slug magy --name "Magy Fashion" --plan starter
python manage.py create_tenant_user --tenant demo --username cashier@demo --password pass123
```

### Redis (Windows)
```powershell
Get-Service Redis          # الحالة: Running
redis-cli ping             # PONG
```
في `.env`: `USE_REDIS=true`

## هيكل قواعد البيانات

| DB | محتوى |
|----|--------|
| `MainClothes` | Plans, Tenants, Subscriptions (SaaS) |
| `mahaly_t_{slug}` | Users, Branches, ERP |

كل منشأة جديدة من Django Admin تحصل على **دور PostgreSQL منفصل** (`db_user` + باسورد) مخزّن مشفّراً في `MainClothes`. الاتصال بقاعدة المحل يتم بهذا الدور وليس بحساب المنصة.

```bash
python manage.py migrate_platform          # بعد إضافة الحقول الجديدة
python manage.py backfill_tenant_db_users  # للمنشآت القديمة بدون db_user
python manage.py show_tenant_db_credentials --slug my-store
```

مستخدم `DB_USER` في `.env` يجب أن يملك `CREATEROLE` و `CREATEDB` على PostgreSQL.
