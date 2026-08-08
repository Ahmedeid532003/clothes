# Cloudflare Pages deploy (fixes Node TLS on some Windows setups)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$ApiUrl = "https://mahalyerp-api.fly.dev/api/v1"
$env:VITE_API_URL = $ApiUrl
Write-Host "Building with VITE_API_URL=$ApiUrl" -ForegroundColor Cyan
npm run build:cloudflare

if (-not (Test-Path (Join-Path $Root "dist\index.html"))) {
    Write-Error "Build failed - dist/index.html missing"
}

$env:NODE_OPTIONS = "--use-system-ca"
if ($env:CLOUDFLARE_ACCOUNT_ID) {
    $env:WRANGLER_ACCOUNT_ID = $env:CLOUDFLARE_ACCOUNT_ID
}

# Include functions + wrangler.toml so /api/* proxy works if ever needed
$stage = Join-Path $Root (".pages-deploy-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item -Path (Join-Path $Root "dist\*") -Destination $stage -Recurse -Force
if (Test-Path (Join-Path $Root "functions")) {
    Copy-Item -Path (Join-Path $Root "functions") -Destination (Join-Path $stage "functions") -Recurse -Force
}
Copy-Item -Path (Join-Path $Root "wrangler.toml") -Destination (Join-Path $stage "wrangler.toml") -Force

npx wrangler pages deploy $stage --project-name=mahalyerp --commit-dirty=true --branch=main

Write-Host ""
Write-Host "Site: https://mahalyerp.pages.dev" -ForegroundColor Green
Write-Host "API:  $ApiUrl" -ForegroundColor Green
