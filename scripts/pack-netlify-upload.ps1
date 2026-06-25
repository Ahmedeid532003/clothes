# يبني الفرونت ويُنشئ ملف ZIP جاهز لرفع Netlify Drop
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

npm run build:netlify

$outDir = Join-Path $Root "release"
$zip = Join-Path $outDir "mahalyerp-netlify-deploy.zip"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $zip) {
  try { Remove-Item $zip -Force } catch { $zip = Join-Path $outDir ("mahalyerp-netlify-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".zip") }
}
Compress-Archive -Path (Join-Path $Root "dist\*") -DestinationPath $zip -CompressionLevel Optimal

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host ""
Write-Host "Ready for Netlify Drop:" -ForegroundColor Green
Write-Host $zip
Write-Host "Size: $mb MB"
Write-Host "Upload at: https://app.netlify.com/drop"
