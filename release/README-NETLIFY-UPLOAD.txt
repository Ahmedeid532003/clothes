# رفع Ma7alyErp على Netlify (سحب وإفلات)

## الملف الجاهز للرفع

`release/mahalyerp-netlify-upload.zip`

المسار الكامل:
`c:\Users\DELL\OneDrive\Desktop\clothes-main\release\mahalyerp-netlify-upload.zip`

## خطوات الرفع

1. افتح: https://app.netlify.com/drop
2. اسحب الملف `mahalyerp-netlify-upload.zip` إلى الصفحة (أو اختره من الجهاز).
3. انتظر حتى ينتهي الرفع — سيظهر رابط مثل `https://xxxx.netlify.app`.

## بعد الرفع

- جرّب تسجيل الدخول: `eidahmed` / `123456789`
- الباك إند وقاعدة البيانات على VPS: `http://128.140.127.179:8788`
- الـ API يعمل عبر proxy داخل الملف (`_redirects`)

## إعادة البناء لاحقاً

```powershell
cd c:\Users\DELL\OneDrive\Desktop\clothes-main
npm run build:netlify
powershell -File scripts\pack-netlify-upload.ps1
```
