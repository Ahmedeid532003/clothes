# Deploy Ma7alyErp API to Fly.io
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$App = "mahalyerp-api"
Set-Location $Root

if (-not (Get-Command flyctl -ErrorAction SilentlyContinue)) {
    Write-Error "flyctl not found. Install: https://fly.io/docs/flyctl/install/"
}

Write-Host "=== Fly.io deploy: $App ===" -ForegroundColor Cyan
Write-Host "Account:" -NoNewline
flyctl auth whoami

Write-Host ""
Write-Host "Secrets:" -ForegroundColor DarkCyan
flyctl secrets list -a $App

if (-not (Test-Path (Join-Path $Root "fly.toml"))) {
    Write-Error "fly.toml missing in project root"
}

Write-Host ""
Write-Host "Building and deploying (remote builder)..." -ForegroundColor Yellow
flyctl deploy --remote-only -a $App

Write-Host ""
Write-Host "Waiting for health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

flyctl status -a $App
Write-Host ""
flyctl checks list -a $App

$healthUrl = "https://${App}.fly.dev/api/v1/health/"
Write-Host ""
Write-Host "Test in browser:" -ForegroundColor Green
Write-Host $healthUrl

try {
    $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 45
    Write-Host "Response: $($r.Content)" -ForegroundColor Green
} catch {
    Write-Host "Health check not ready yet — see: flyctl logs -a $App" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "First time? Seed data:" -ForegroundColor Cyan
Write-Host "  flyctl ssh console -a $App"
Write-Host "  python manage.py seed_platform"
Write-Host "  python manage.py seed_demo_tenant"
Write-Host ""
Write-Host "Frontend: npm run pack:cloudflare  (see docs/DEPLOY-FLY.md)" -ForegroundColor Cyan
