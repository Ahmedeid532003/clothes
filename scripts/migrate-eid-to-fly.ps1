# Migrate tenant (default: eid) from local PostgreSQL to Fly/Neon
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "backend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$Slug = if ($args[0]) { $args[0] } else { "eid" }
$App = "mahalyerp-api"

if (-not (Test-Path $Python)) {
    Write-Error "Backend venv missing at $Python"
}

$pg = Get-Service postgresql-x64-16 -ErrorAction SilentlyContinue
$pgCtl = "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe"
$pgData = "C:\Program Files\PostgreSQL\16\data"
$pgRunning = $false
if (Test-Path $pgCtl) {
    $st = & $pgCtl -D $pgData status 2>&1 | Out-String
    if ($st -match "server is running") { $pgRunning = $true }
}
if (-not $pgRunning -and $pg -and $pg.Status -ne "Running") {
    Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
    try {
        Start-Service postgresql-x64-16 -ErrorAction Stop
    } catch {
        Write-Host "Run PowerShell as Administrator, then:" -ForegroundColor Red
        Write-Host "  net start postgresql-x64-16" -ForegroundColor Cyan
        Write-Host "Then rerun:" -ForegroundColor Red
        Write-Host "  powershell -File scripts\migrate-eid-to-fly.ps1 $Slug" -ForegroundColor Cyan
        exit 1
    }
}

Write-Host "Reading DATABASE_URL from Fly..." -ForegroundColor Cyan
$cloudUrl = ""
try {
    $out = flyctl ssh console -a $App -C "printenv DATABASE_URL" 2>&1
    foreach ($line in ($out -split "`n")) {
        $t = $line.Trim()
        if ($t -match "^postgresql://") {
            $cloudUrl = $t
            break
        }
    }
} catch {
    Write-Host "flyctl ssh failed: $_" -ForegroundColor Yellow
}

if (-not $cloudUrl) {
    Write-Host "Paste DATABASE_URL from Neon Dashboard:" -ForegroundColor Yellow
    $cloudUrl = Read-Host "DATABASE_URL"
}

if (-not $cloudUrl) {
    Write-Error "DATABASE_URL required"
}

Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:CLOUD_SHARED_DB -ErrorAction SilentlyContinue
$env:CLOUD_DATABASE_URL = $cloudUrl

Set-Location $Backend
Write-Host "Migrating tenant $Slug to cloud..." -ForegroundColor Green
& $Python manage.py push_tenant_to_cloud --slug $Slug --cloud-database-url $cloudUrl

Write-Host ""
Write-Host "Done. Login at https://mahalyerp.pages.dev" -ForegroundColor Green
Write-Host "  Tenant: $Slug" -ForegroundColor Cyan
Write-Host "  User  : eid1" -ForegroundColor Cyan
