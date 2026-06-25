# Cloudflare Pages — يعمل من مصر (بديل Netlify المحظور على TE Data)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$env:VITE_API_URL = "/api/v1"
$env:VITE_DEPLOY_ACCESS_CODE = ""
npm run build:netlify

if (-not (Test-Path (Join-Path $Root "dist\index.html"))) {
    Write-Error "Build failed"
}

$outDir = Join-Path $Root "release"
$zip = Join-Path $outDir "MAHALY-CLOUDFLARE-FIXED.zip"
$stage = Join-Path $outDir "cloudflare-deploy"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item -Path (Join-Path $Root "dist\*") -Destination $stage -Recurse -Force
Copy-Item -Path (Join-Path $Root "functions") -Destination (Join-Path $stage "functions") -Recurse -Force
Copy-Item -Path (Join-Path $Root "wrangler.toml") -Destination (Join-Path $stage "wrangler.toml") -Force

# SPA فقط — الـ API عبر functions/api/[[path]].js
@"
/*  /index.html  200
"@ | Out-File (Join-Path $stage "_redirects") -Encoding ascii -NoNewline
Add-Content (Join-Path $stage "_redirects") ""

if (Test-Path $zip) {
    try { Remove-Item $zip -Force } catch {
        $zip = Join-Path $outDir ("MAHALY-CLOUDFLARE-FIXED-" + (Get-Date -Format "HHmm") + ".zip")
    }
}
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -CompressionLevel Optimal

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host ""
Write-Host "CLOUDFLARE PACKAGE:" -ForegroundColor Green
Write-Host $zip
Write-Host "Size: $mb MB"
