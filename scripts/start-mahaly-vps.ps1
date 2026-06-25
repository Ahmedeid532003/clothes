# تشغيل Ma7alyErp على VPS ويندوز
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$DeployEnv = Join-Path $Root "deploy\vps.env"

Get-Content $DeployEnv | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        Set-Variable -Name $matches[1].Trim() -Value $matches[2].Trim() -Scope Script
    }
}

$backendDir = Join-Path $Root "backend"
$logDir = Join-Path $Root "deploy\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Write-Host "=== Ma7alyErp VPS ===" -ForegroundColor Cyan
Write-Host "App:   http://${VPS_IP}:${MAHALY_WEB_PORT}"
Write-Host "API:   http://${VPS_IP}:${MAHALY_API_PORT}/api/v1"
Write-Host "Admin: http://${VPS_IP}:${MAHALY_API_PORT}/admin/"

foreach ($p in @($MAHALY_WEB_PORT, $MAHALY_API_PORT)) {
    $ruleName = "Ma7alyErp-Port-$p"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $p | Out-Null
    }
}

# إيقاف نسخ قديمة على نفس المنافذ
Get-NetTCPConnection -LocalPort $MAHALY_API_PORT,$MAHALY_WEB_PORT -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 1

if (-not (Test-Path (Join-Path $Root "dist\index.html"))) {
    Set-Location $Root
    $env:NODE_OPTIONS = "--max-old-space-size=2048"
    npm run build
    if (-not (Test-Path (Join-Path $Root "dist\index.html"))) {
        Write-Host "Build failed - starting dev server instead." -ForegroundColor Yellow
    }
}

$useDev = -not (Test-Path (Join-Path $Root "dist\index.html"))

$venvPython = Join-Path $backendDir ".venv\Scripts\waitress-serve.exe"
if (-not (Test-Path $venvPython)) {
    Write-Error "Run setup-mahaly-vps.ps1 first"
}

Start-Process -FilePath $venvPython `
    -ArgumentList "--listen=0.0.0.0:$MAHALY_API_PORT", "config.wsgi:application" `
    -WorkingDirectory $backendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir "api.log") `
    -RedirectStandardError (Join-Path $logDir "api.err.log")

Start-Sleep -Seconds 2

if ($useDev) {
    Start-Process -FilePath "npm.cmd" `
        -ArgumentList "run", "dev" `
        -WorkingDirectory $Root `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDir "web.log") `
        -RedirectStandardError (Join-Path $logDir "web.err.log")
} else {
    $npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
    if (-not $npx) { $npx = (Get-Command npx -ErrorAction SilentlyContinue).Source }
    if (-not $npx) { $npx = "npx.cmd" }

    Start-Process -FilePath $npx `
        -ArgumentList "vite", "preview", "--host", "0.0.0.0", "--port", $MAHALY_WEB_PORT, "--strictPort" `
        -WorkingDirectory $Root `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDir "web.log") `
        -RedirectStandardError (Join-Path $logDir "web.err.log")
}

Start-Sleep -Seconds 3
Write-Host "Started. Open: http://${VPS_IP}:${MAHALY_WEB_PORT}" -ForegroundColor Green
