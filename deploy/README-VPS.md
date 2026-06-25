# تشغيل Ma7alyErp على VPS ويندوز

## الروابط (بعد التشغيل)

| | |
|--|--|
| **التطبيق** | http://128.140.127.179:8787 |
| **API** | http://128.140.127.179:8788/api/v1 |
| **Admin** | http://128.140.127.179:8788/admin/ |

منافذ **8787** و **8788** مخصصة لـ Ma7aly فقط — مشاريع أخرى على 80/8000 لا تتأثر.

## كلمة دخول السيرفر (بوابة VPS)

افتراضياً في `deploy/vps.env`:

```
DEPLOY_ACCESS_CODE=Ma7aly@VPS2026
```

غيّرها في `deploy/vps.env` ثم أعد تشغيل `setup-mahaly-vps.ps1`.

## أوامر

```powershell
cd C:\Users\Administrator\Downloads\Clothes
.\scripts\setup-mahaly-vps.ps1    # أول مرة أو بعد تغيير الإعدادات
.\scripts\start-mahaly-vps.ps1    # تشغيل
```

## إيقاف

```powershell
Get-Job | Stop-Job
Get-Job | Remove-Job
```
