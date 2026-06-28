# رفع secrets إلى Fly.io من deploy/fly.local.env
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$EnvFile = Join-Path $Root "deploy\fly.local.env"
$Example = Join-Path $Root "deploy\fly.env.example"
$App = "mahalyerp-api"

if (-not (Test-Path $EnvFile)) {
    Copy-Item $Example $EnvFile
    Write-Host ""
    Write-Host "Created deploy/fly.local.env — edit DATABASE_URL and SECRET_KEY, then run again." -ForegroundColor Yellow
    Write-Host $EnvFile
    exit 1
}

$pairs = @()
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        if ($val -match 'YOUR_|change-to-random|USER:PASS') {
            Write-Host "Skip placeholder: $key" -ForegroundColor DarkYellow
            return
        }
        $pairs += "${key}=${val}"
    }
}

if ($pairs.Count -lt 2) {
    Write-Error "fly.local.env needs at least DATABASE_URL and SECRET_KEY filled in."
}

Write-Host "Setting $($pairs.Count) secrets on $App ..." -ForegroundColor Cyan
flyctl secrets set -a $App @pairs

Write-Host ""
flyctl secrets list -a $App
Write-Host "Done. Run: npm run deploy:fly" -ForegroundColor Green
