# حزمة كاملة للرفع على VPS عبر RDP (سحب وإفلات أو فك ضغط)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$vpsIp = "128.140.127.179"
$apiPort = "8788"
$env:VITE_API_URL = "http://${vpsIp}:${apiPort}/api/v1"
$env:VITE_DEPLOY_ACCESS_CODE = ""
$env:NODE_OPTIONS = "--max-old-space-size=4096"

Write-Host "Building frontend for VPS..." -ForegroundColor Cyan
npm run build
if (-not (Test-Path (Join-Path $Root "dist\index.html"))) {
    Write-Error "Build failed"
}

$outDir = Join-Path $Root "release"
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$stage = Join-Path $outDir "vps-full-$stamp"
$zip = Join-Path $outDir "MAHALY-VPS-FULL-$stamp.zip"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

$exclude = @('node_modules', '.venv', '.git', 'release', '.cursor', '__pycache__', 'dist')
Get-ChildItem $Root -Force | Where-Object {
    $exclude -notcontains $_.Name
} | ForEach-Object {
    Copy-Item $_.FullName -Destination (Join-Path $stage $_.Name) -Recurse -Force
}

Copy-Item (Join-Path $Root "dist") (Join-Path $stage "dist") -Recurse -Force

$readme = @"
رفع Ma7alyErp على VPS
=====================

1) افتح RDP على السيرفر: $vpsIp
2) انسخ الملف: $zip
3) فك الضغط في: C:\Users\Administrator\Downloads\Clothes
   (أو استبدل المجلد القديم بعد نسخ احتياطي)
4) على السيرفر — PowerShell كمسؤول:

   cd C:\Users\Administrator\Downloads\Clothes
   .\scripts\setup-mahaly-vps.ps1    # أول مرة فقط أو بعد تغيير env
   .\scripts\deploy-update.ps1       # migrate + build + تشغيل

5) افتح:
   http://${vpsIp}:8787
   API: http://${vpsIp}:${apiPort}/api/v1

أو للتحديث السريع (بدون إعادة venv):
   cd backend
   .\.venv\Scripts\python.exe manage.py migrate
   .\.venv\Scripts\python.exe manage.py migrate_all_tenants
   cd ..
   .\scripts\start-mahaly-vps.ps1
"@
$readme | Out-File (Join-Path $stage "VPS-INSTALL.txt") -Encoding utf8
$readme | Out-File (Join-Path $outDir "VPS-INSTALL-$stamp.txt") -Encoding utf8

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -CompressionLevel Optimal

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host ""
Write-Host "VPS full package ready:" -ForegroundColor Green
Write-Host $zip
Write-Host "Size: $mb MB"
Write-Host "Upload via RDP then run deploy-update.ps1 on server" -ForegroundColor Cyan
