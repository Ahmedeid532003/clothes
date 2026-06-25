# إعادة تشغيل API فقط (بعد تعديل الكود)
$ErrorActionPreference = "SilentlyContinue"
$backendDir = "C:\Users\Administrator\Downloads\Clothes\backend"
$port = 8788

Get-NetTCPConnection -LocalPort $port -State Listen | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force
}
Start-Sleep -Seconds 2

Start-Process `
    -FilePath "$backendDir\.venv\Scripts\waitress-serve.exe" `
    -ArgumentList "--listen=0.0.0.0:$port", "config.wsgi:application" `
    -WorkingDirectory $backendDir `
    -WindowStyle Hidden

Write-Host "API restarted on port $port" -ForegroundColor Green
Write-Host "Admin: http://128.140.127.179:$port/admin/"
Write-Host "Login: admin / Ma7aly@Admin2026"
