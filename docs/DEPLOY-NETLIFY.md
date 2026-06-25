# نشر Ma7alyErp على Netlify

## مهم: ماذا يُنشر أين؟

| المكوّن | Netlify | السبب |
|---------|---------|--------|
| **Frontend** (React) | ✅ نعم | موقع ثابت من مجلد `dist` |
| **Backend** (Django) | ❌ لا | يحتاج سيرفر Python دائم |
| **Database** (PostgreSQL) | ❌ لا | Netlify لا يستضيف قواعد بيانات |

**الباك إند وقاعدة البيانات يبقيان على VPS:** `http://128.140.127.179:8788`  
الفرونت على Netlify يتصل بهم عبر **proxy** في `netlify.toml` (مسار `/api/*`).

---

## 1. إعادة المزامنة من VPS (محلي)

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py pull_vps_database --skip-reset
```

لمزامنة منشأة واحدة:

```powershell
.\.venv\Scripts\python.exe manage.py pull_vps_database --skip-reset --tenant ahmedeid
```

---

## 2. بناء الفرونت

```powershell
cd ..
npm run build
```

---

## 3. النشر على Netlify

### الطريقة أ — ربط GitHub (مُفضّلة)

1. ارفع المشروع إلى GitHub.
2. في [Netlify](https://app.netlify.com) → **Add new site** → **Import from Git**.
3. الإعدادات تُقرأ تلقائياً من `netlify.toml`:
   - Build: `npm run build`
   - Publish: `dist`
   - `VITE_API_URL=/api/v1`
4. Deploy.

### الطريقة ب — Netlify CLI

```powershell
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod --dir=dist
```

### الطريقة ج — سحب وإفلات (بدون Git)

1. شغّل `npm run build`.
2. افتح [app.netlify.com/drop](https://app.netlify.com/drop).
3. اسحب مجلد `dist` إلى الصفحة.
4. **ملاحظة:** بدون `netlify.toml` من المستودع قد لا يعمل proxy الـ API — استخدم Git أو CLI.

---

## 4. متغيرات البيئة على Netlify

في **Site settings → Environment variables**:

| المتغير | القيمة |
|---------|--------|
| `VITE_API_URL` | `/api/v1` |

---

## 5. بعد النشر

- افتح رابط Netlify (مثل `https://your-site.netlify.app`).
- سجّل دخول مثلاً: `eidahmed` / `123456789` — منشأة `ahmedeid`.

---

## تغيير سيرفر الـ API

عدّل في `netlify.toml` السطر:

```toml
to = "http://128.140.127.179:8788/api/:splat"
```
