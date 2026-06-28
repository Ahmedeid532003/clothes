# يبني فرونت للـ VPS (باك إند + داتابيز على نفس السيرفر)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$vpsIp = "128.140.127.179"
$apiPort = "8788"
$env:VITE_API_URL = "http://${vpsIp}:${apiPort}/api/v1"
$env:VITE_DEPLOY_ACCESS_CODE = ""

npm run build

$outDir = Join-Path $Root "release"
$zip = Join-Path $outDir "mahalyerp-vps-upload.zip"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $Root "dist\*") -DestinationPath $zip -CompressionLevel Optimal

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host ""
Write-Host "VPS package ready:" -ForegroundColor Green
Write-Host $zip
Write-Host "Size: $mb MB"
Write-Host ""
Write-Host "Open in browser (full stack on VPS):" -ForegroundColor Cyan
Write-Host "http://${vpsIp}:8787"
Write-Host "API: http://${vpsIp}:${apiPort}/api/v1"
