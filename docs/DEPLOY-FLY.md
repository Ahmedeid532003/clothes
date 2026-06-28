# Ma7alyErp — نشر Fly.io (API) + Cloudflare (Frontend)

## المعمارية

```
المستخدم
   ↓
Cloudflare Pages          ← React (dist)
   ↓  /api/v1/*
Fly.io mahalyerp-api      ← Django + Gunicorn
   ↓
Neon PostgreSQL           ← DATABASE_URL (مجاني، بدون فيزا)
```

| الجزء | المنصة | الرابط |
|-------|--------|--------|
| API | Fly.io | https://mahalyerp-api.fly.dev |
| Frontend | Cloudflare Pages | https://YOUR-SITE.pages.dev |
| Database | Neon | connection string في Fly secrets |

---

## المتطلبات

1. **Fly.io** — https://fly.io (يحتاج **بطاقة فيزا** بعد التجربة القصيرة)
2. **Neon** — https://neon.tech (PostgreSQL مجاني، **بدون فيزا**)
3. **Cloudflare** — https://dash.cloudflare.com (فرونت مجاني)
4. **flyctl** — مثبت عندك: `flyctl version`

---

## الجزء 1 — قاعدة البيانات (Neon) — 5 دقائق

1. سجّل في https://neon.tech (GitHub)
2. **New Project** → اسم: `mahalyerp`
3. انسخ **Connection string** (PostgreSQL)
   ```
   postgresql://USER:PASS@ep-xxx.neon.tech/neondb?sslmode=require
   ```

---

## الجزء 2 — Fly.io API — 15 دقيقة

### 2.1 تسجيل الدخول

```powershell
flyctl auth login
flyctl auth whoami
```

### 2.2 إعداد الأسرار (مرة واحدة)

**الطريقة أ — ملف محلي (أسهل):**

1. انسخ `deploy/fly.env.example` → `deploy/fly.local.env`
2. عدّل `DATABASE_URL` و `SECRET_KEY` (سلسلة عشوائية 50+ حرف)
3. شغّل:

```powershell
npm run fly:secrets
```

**الطريقة ب — يدوي:**

```powershell
flyctl secrets set -a mahalyerp-api `
  DATABASE_URL="postgresql://..." `
  SECRET_KEY="your-long-random-secret-key-here" `
  CLOUD_SHARED_DB="true" `
  DEBUG="false" `
  USE_REDIS="false" `
  DEPLOY_GATE_ENABLED="false"
```

تحقق:

```powershell
flyctl secrets list -a mahalyerp-api
```

### 2.3 النشر

```powershell
cd C:\Users\DELL\OneDrive\Desktop\clothes-main
npm run deploy:fly
```

أو:

```powershell
flyctl deploy --remote-only -a mahalyerp-api
```

### 2.4 اختبار

افتح في المتصفح:

```
https://mahalyerp-api.fly.dev/api/v1/health/
```

المفروض:

```json
{"status":"ok","database":"connected"}
```

### 2.5 بذور البيانات (أول مرة فقط)

```powershell
flyctl ssh console -a mahalyerp-api
```

داخل السيرفر:

```bash
python manage.py seed_platform
python manage.py seed_demo_tenant
exit
```

**دخول تجريبي:**

| | |
|--|--|
| كود المنشأة | `demo` |
| المستخدم | `owner@demo` |
| كلمة المرور | `demo1234` |

---

## الجزء 3 — الفرونت (Cloudflare Pages) — 10 دقائق

### 3.1 تجهيز ZIP (من جهازك)

```powershell
npm run pack:cloudflare
```

الملف: `release\MAHALY-CLOUDFLARE-FIXED.zip`

### 3.2 رفع على Cloudflare

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**
2. **Upload assets** → اسحب محتويات الـ ZIP (أو الملف مضغوط)
3. **Settings → Environment variables** (Production):

| المتغير | القيمة |
|---------|--------|
| `VITE_API_URL` | `/api/v1` |
| `MAHALY_API_URL` | `https://mahalyerp-api.fly.dev/api` |

4. **Redeploy** إذا لزم

### 3.3 CORS على Fly (بعد معرفة رابط Cloudflare)

```powershell
flyctl secrets set -a mahalyerp-api `
  CORS_ALLOWED_ORIGINS="https://YOUR-SITE.pages.dev" `
  CSRF_TRUSTED_ORIGINS="https://YOUR-SITE.pages.dev"
```

---

## أوامر مفيدة

```powershell
# حالة التطبيق
flyctl status -a mahalyerp-api

# اللوجات
flyctl logs -a mahalyerp-api

# إعادة تشغيل
flyctl machine restart -a mahalyerp-api

# تحديث بعد git pull
npm run deploy:fly
```

---

## ملفات المشروع

| ملف | الغرض |
|-----|--------|
| `fly.toml` | إعداد Fly.io |
| `Dockerfile` | بناء صورة Django |
| `deploy/fly.env.example` | قالب الأسرار |
| `deploy/fly.local.env` | أسرارك (لا يُرفع Git) |
| `scripts/fly-deploy.ps1` | نشر API |
| `scripts/fly-secrets.ps1` | رفع secrets من fly.local.env |
| `wrangler.toml` | إعداد Cloudflare + Fly proxy |
| `functions/api/[[path]].js` | proxy `/api/*` → Fly |

---

## مشاكل شائعة

| المشكلة | الحل |
|---------|------|
| App **suspended** | أضف بطاقة في https://fly.io/dashboard/billing |
| health فاشل | `flyctl logs -a mahalyerp-api` |
| CORS error | حدّث `CORS_ALLOWED_ORIGINS` برابط Cloudflare |
| بطء أول طلب | Fly يوقف المachine — `auto_start` يشغّله (~30 ث) |
| Netlify من مصر | استخدم **Cloudflare Pages** فقط |

---

## التكلفة التقريبية

| | |
|--|--|
| Neon | $0 (مجاني) |
| Cloudflare Pages | $0 |
| Fly.io | ~$3–5/شهر بعد التجربة (يحتاج فيزا) |
