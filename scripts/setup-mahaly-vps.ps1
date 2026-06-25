# إعداد أولي لـ Ma7alyErp على VPS
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$DeployEnv = Join-Path $Root "deploy\vps.env"

Get-Content $DeployEnv | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        Set-Variable -Name $matches[1].Trim() -Value $matches[2].Trim() -Scope Script
    }
}

$ApiUrl = "http://${VPS_IP}:${MAHALY_API_PORT}/api/v1"
$WebOrigin = "http://${VPS_IP}:${MAHALY_WEB_PORT}"
$Cors = "$WebOrigin,http://127.0.0.1:${MAHALY_WEB_PORT}"
$Hosts = "localhost,127.0.0.1,${VPS_IP}"

Write-Host "=== Ma7alyErp VPS Setup ===" -ForegroundColor Cyan

# Frontend .env
@"
VITE_API_URL=$ApiUrl
VITE_DEPLOY_ACCESS_CODE=
"@ | Out-File (Join-Path $Root ".env") -Encoding ascii -NoNewline
Add-Content (Join-Path $Root ".env") "" -Encoding ascii

# Backend .env (يحافظ على DB_PASSWORD إن وُجد)
$backendEnvPath = Join-Path $Root "backend\.env"
$existingDbPass = "85238521"
if (Test-Path $backendEnvPath) {
    $m = Select-String -Path $backendEnvPath -Pattern '^DB_PASSWORD=(.+)$' | Select-Object -First 1
    if ($m) { $existingDbPass = $m.Matches.Groups[1].Value }
}

@"
SECRET_KEY=mahaly-vps-$(New-Guid)
DEBUG=False
ALLOWED_HOSTS=$Hosts

DB_USER=postgres
DB_PASSWORD=$existingDbPass
DB_HOST=127.0.0.1
DB_PORT=5432
SAAS_DB_NAME=MainClothes

TENANT_DB_PREFIX=mahaly_t_
USE_REDIS=false
REDIS_URL=redis://127.0.0.1:6379/0

CORS_ALLOWED_ORIGINS=$Cors

DEPLOY_GATE_ENABLED=false
DEPLOY_ACCESS_CODE=
"@ | Out-File $backendEnvPath -Encoding ascii

Write-Host "Wrote .env and backend\.env"

# Python venv
$backendDir = Join-Path $Root "backend"
Set-Location $backendDir
if (Test-Path ".venv") {
    Write-Host "Removing broken venv..."
    Remove-Item -Recurse -Force ".venv"
}
py -3.11 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe -m pip install waitress

Write-Host "Running migrations..."
& .\.venv\Scripts\python.exe manage.py migrate
& .\.venv\Scripts\python.exe manage.py migrate_all_tenants 2>$null
& .\.venv\Scripts\python.exe manage.py collectstatic --noinput

Set-Location $Root
Write-Host "Building frontend..."
npm run build

Write-Host ""
Write-Host "Setup complete. Run: .\scripts\start-mahaly-vps.ps1" -ForegroundColor Green
Write-Host "URL: $WebOrigin"
Write-Host "Access code: $DEPLOY_ACCESS_CODE" -ForegroundColor Yellow
