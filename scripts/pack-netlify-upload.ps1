# Netlify fixed package — API via proxy (/api/v1), not direct VPS URL
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$env:VITE_API_URL = "/api/v1"
$env:VITE_DEPLOY_ACCESS_CODE = ""
npm run build:netlify

$js = Get-ChildItem (Join-Path $Root "dist\assets\index-*.js") | Select-Object -First 1
$jsText = Get-Content $js.FullName -Raw
if ($jsText -match "128\.140\.127\.179") {
    Write-Error "Build error: VPS IP in bundle. Use /api/v1 only for Netlify."
}
if (-not (Test-Path (Join-Path $Root "dist\_redirects"))) {
    Write-Error "Missing dist\_redirects."
}

$outDir = Join-Path $Root "release"
$folder = Join-Path $outDir "netlify-site"
$zip = Join-Path $outDir "MAHALY-NETLIFY-FIXED.zip"

if (Test-Path $folder) {
    try { Remove-Item $folder -Recurse -Force } catch { $folder = Join-Path $outDir ("netlify-site-" + (Get-Date -Format "HHmmss")) }
}
New-Item -ItemType Directory -Force -Path $folder | Out-Null
Copy-Item -Path (Join-Path $Root "dist\*") -Destination $folder -Recurse -Force

if (Test-Path $zip) {
    try { Remove-Item $zip -Force } catch {
        $zip = Join-Path $outDir ("MAHALY-NETLIFY-FIXED-" + (Get-Date -Format "HHmm") + ".zip")
    }
}
Compress-Archive -Path (Join-Path $folder "*") -DestinationPath $zip -CompressionLevel Optimal

$readme = @(
    "UPLOAD THIS FILE TO NETLIFY ONLY",
    "File: MAHALY-NETLIFY-FIXED.zip",
    "Path: $zip",
    "",
    "DO NOT upload mahalyerp-vps-upload.zip (VPS only).",
    "",
    "Steps:",
    "1) https://app.netlify.com/drop",
    "2) Drag MAHALY-NETLIFY-FIXED.zip",
    "3) Test: https://YOUR-SITE.netlify.app/api/v1/health/",
    "",
    "Backend + DB stay on VPS; Netlify proxies /api/* automatically."
)
$readme | Out-File (Join-Path $outDir "UPLOAD-THIS-TO-NETLIFY.txt") -Encoding utf8

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host ""
Write-Host "NETLIFY FIXED ZIP:" -ForegroundColor Green
Write-Host $zip
Write-Host "Size: $mb MB"
Write-Host "Folder: $folder"
Write-Host "Upload: https://app.netlify.com/drop"
