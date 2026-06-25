# ═══════════════════════════════════════════════════════════════
#  Ma7alyErp — نشر كامل بدون VPS
#  Render (باك + داتا) + Cloudflare Pages أو Netlify (فرونت)
# ═══════════════════════════════════════════════════════════════

## المعمارية

```
المستخدم
   ↓
Cloudflare Pages  أو  Netlify     ←  الفرونت إند فقط
   ↓  /api/v1/*
Render.com                         ←  Django + PostgreSQL
```

**لا يوجد VPS في هذا الإعداد.**

---

## الجزء 1 — الباك إند + الداتابيز (Render) — 15 دقيقة

1. سجّل: https://dashboard.render.com/
2. **New +** → **Blueprint** → اربط GitHub → المستودع `Ahmedeid532003/clothes`
3. Render يقرأ `render.yaml` وينشئ:
   - **mahalyerp-api** (Django)
   - **mahalyerp-db** (PostgreSQL مجاني)
4. بعد النشر انسخ رابط API، مثال:
   ```
   https://mahalyerp-api.onrender.com
   ```
5. في Render → **mahalyerp-api** → **Environment** أضف:

   | المتغير | القيمة (عدّل بعد نشر الفرونت) |
   |---------|-------------------------------|
   | `CORS_ALLOWED_ORIGINS` | `https://ma7aly.pages.dev,https://YOUR.netlify.app` |
   | `CSRF_TRUSTED_ORIGINS` | نفس القيم أعلاه |

6. تحقق:
   ```
   https://mahalyerp-api.onrender.com/api/v1/health/
   ```
   → `{"status":"ok","database":"connected"}`

7. بذور أولية (من Render Shell أو محلياً مع DATABASE_URL):
   ```bash
   python manage.py seed_platform
   python manage.py seed_demo_tenant
   ```

---

## الجزء 2أ — الفرونت (Cloudflare Pages) — يعمل من مصر ✓

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect Git**
2. المستودع: `Ahmedeid532003/clothes`
3. الإعدادات:

   | | |
   |--|--|
   | Build command | `npm run build:netlify` |
   | Output | `dist` |
   | `VITE_API_URL` | `/api/v1` |
   | `MAHALY_API_URL` | `https://mahalyerp-api.onrender.com/api` |

4. Deploy → الرابط: `https://ma7aly.pages.dev`
5. حدّث `CORS_ALLOWED_ORIGINS` على Render برابط Cloudflare

---

## الجزء 2ب — الفرونت (Netlify) — قد لا يفتح من TE Data

1. https://app.netlify.com → Import Git → `Ahmedeid532003/clothes`
2. **Environment variables** (Build):

   | | |
   |--|--|
   | `VITE_API_URL` | `https://mahalyerp-api.onrender.com/api/v1` |

3. Deploy
4. أضف رابط Netlify في `CORS_ALLOWED_ORIGINS` على Render

> من مصر بدون دومين: استخدم **Cloudflare Pages** وليس Netlify.

---

## الجزء 3 — إيقاف VPS (اختياري)

بعد التأكد أن Cloudflare/Netlify + Render يعملان:
- أوقف السيرفر `128.140.127.179` من لوحة Hetzner
- لا حاجة له بعد نقل البيانات

لنقل بيانات قديمة من VPS:
```bash
python manage.py pull_vps_database --skip-reset
```
(قبل إيقاف VPS)

---

## ملاحظات

- Render المجاني: السيرفر ينام بعد 15 دقيقة خمول — أول طلب قد يأخذ 30–60 ثانية
- PostgreSQL المجاني على Render: ينتهي بعد 90 يوم (ترقية أو نسخ احتياطي)
- Netlify **لا يستضيف** Django أو PostgreSQL — Render يستضيفهما

---

## أوامر محلية للاختبار مع Render DB

```bash
# في backend/.env
DATABASE_URL=postgresql://...  # من Render Dashboard
ALLOWED_HOSTS=localhost,127.0.0.1
DEBUG=true
```
