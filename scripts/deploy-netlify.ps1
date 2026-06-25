# بناء ونشر الفرونت على Netlify
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Write-Host "=== Ma7alyErp Netlify Deploy ===" -ForegroundColor Cyan

Set-Location $Root
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run build:netlify

if (-not (Test-Path (Join-Path $Root "dist\index.html"))) {
    Write-Error "Build failed — dist\index.html not found"
}

Write-Host ""
Write-Host "Build OK: dist\" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. netlify login && netlify init && netlify deploy --prod --dir=dist"
Write-Host "  2. Or connect GitHub repo at https://app.netlify.com"
Write-Host "  3. Or drag dist\ folder to https://app.netlify.com/drop"
Write-Host ""
Write-Host "Backend + DB stay on VPS: http://128.140.127.179:8788"
Write-Host "API proxy configured in netlify.toml -> /api/*"
