# Cloudflare Pages deploy (fixes Node TLS on some Windows setups)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

if (-not (Test-Path (Join-Path $Root "dist\index.html"))) {
    $env:VITE_API_URL = "https://mahalyerp-api.fly.dev/api/v1"
    npm run build:cloudflare
}

$env:NODE_OPTIONS = "--use-system-ca"
if ($env:CLOUDFLARE_ACCOUNT_ID) {
    $env:WRANGLER_ACCOUNT_ID = $env:CLOUDFLARE_ACCOUNT_ID
}

npx wrangler pages deploy dist --project-name=mahalyerp --commit-dirty=true --branch=main

Write-Host ""
Write-Host "Site: https://mahalyerp.pages.dev" -ForegroundColor Green
