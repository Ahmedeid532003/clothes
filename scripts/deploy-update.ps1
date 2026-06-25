# تحديث سريع بعد تعديل الكود (بدون إعادة بناء venv)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$backendDir = Join-Path $Root "backend"

Write-Host "=== Ma7alyErp Deploy Update ===" -ForegroundColor Cyan

Set-Location $backendDir
& .\.venv\Scripts\python.exe manage.py migrate
& .\.venv\Scripts\python.exe manage.py migrate_all_tenants
& .\.venv\Scripts\python.exe manage.py collectstatic --noinput

Set-Location $Root
npm run build

& (Join-Path $Root "scripts\start-mahaly-vps.ps1")

Write-Host "Deploy update complete." -ForegroundColor Green
