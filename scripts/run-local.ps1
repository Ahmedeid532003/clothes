param([switch]$Cloud)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "backend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$ApiPort = 8000
$WebPort = 8787

# Local PostgreSQL (old database) — default
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:CLOUD_SHARED_DB -ErrorAction SilentlyContinue
Remove-Item Env:ALLOWED_HOSTS -ErrorAction SilentlyContinue
Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
$env:DEBUG = "True"
$env:ALLOWED_HOSTS = "localhost,127.0.0.1"

if (-not (Test-Path $Python)) {
    Write-Error "Backend venv missing. Run: cd backend; python -m venv .venv; pip install -r requirements.txt"
}

foreach ($port in @($ApiPort, $WebPort)) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

if ($Cloud) {
    $secrets = Join-Path $Root "deploy\fly-secrets.env"
    if (-not (Test-Path $secrets)) { Write-Error "deploy\fly-secrets.env missing" }
    Get-Content $secrets | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        Set-Item -Path "env:$($line.Substring(0, $idx).Trim())" -Value $line.Substring($idx + 1).Trim()
    }
    $env:CLOUD_SHARED_DB = "true"
}

Write-Host "Starting API (local PostgreSQL MainClothes) on http://127.0.0.1:$ApiPort ..." -ForegroundColor Cyan
$apiCmd = "set DATABASE_URL=&& set CLOUD_SHARED_DB=&& set DEBUG=True&& set ALLOWED_HOSTS=localhost,127.0.0.1&& `"$Python`" manage.py runserver 127.0.0.1:$ApiPort"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $apiCmd -WorkingDirectory $Backend -WindowStyle Minimized

Start-Sleep -Seconds 4

Write-Host "Starting frontend on http://127.0.0.1:$WebPort ..." -ForegroundColor Cyan
Set-Location $Root
$webCmd = "set VITE_API_URL=http://127.0.0.1:$ApiPort/api/v1&& set VITE_DEPLOY_ACCESS_CODE=&& npm run dev"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $webCmd -WorkingDirectory $Root -WindowStyle Minimized

Start-Sleep -Seconds 4

try {
    $health = Invoke-WebRequest -Uri "http://127.0.0.1:$ApiPort/api/v1/health/" -UseBasicParsing -TimeoutSec 15
    Write-Host "API health: $($health.Content)" -ForegroundColor Green
} catch {
    Write-Host "API not ready yet - check PostgreSQL or use: npm run dev:cloud" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Open: http://127.0.0.1:$WebPort" -ForegroundColor Green
Write-Host 'Login examples: ahmedeid / owner@ahmedeid  or  demo / owner@demo' -ForegroundColor Green
