# Frontend local + Fly.io backend (no local PostgreSQL needed)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$WebPort = 8787
$FlyApi = if ($env:MAHALY_FLY_API) { $env:MAHALY_FLY_API.TrimEnd('/') } else { "https://mahalyerp-api.fly.dev" }

Get-NetTCPConnection -LocalPort $WebPort -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 2

Write-Host "Backend (cloud): $FlyApi" -ForegroundColor Cyan
Write-Host "Starting frontend on http://127.0.0.1:$WebPort ..." -ForegroundColor Cyan

Set-Location $Root
$cmd = "set VITE_API_URL=$FlyApi/api/v1&& set VITE_DEPLOY_ACCESS_CODE=&& npm run dev"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmd -WorkingDirectory $Root -WindowStyle Minimized

Start-Sleep -Seconds 6

try {
    $h = Invoke-WebRequest -Uri "$FlyApi/api/v1/health/" -UseBasicParsing -TimeoutSec 20
    Write-Host "Fly API: $($h.Content)" -ForegroundColor Green
} catch {
    Write-Host "Fly API check failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Open: http://127.0.0.1:$WebPort" -ForegroundColor Green
Write-Host 'Login: demo / owner@demo / demo1234' -ForegroundColor Green
