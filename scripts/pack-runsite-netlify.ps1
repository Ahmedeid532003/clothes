# Netlify drag-drop — frontend + /api proxy to Runsite (Neon DB)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$ApiHost = if ($env:MAHALY_RUNSITE_API) { $env:MAHALY_RUNSITE_API } else { "https://mahalyerp-api.runsite.app" }
$ApiHost = $ApiHost.TrimEnd("/")

$env:VITE_API_URL = "/api/v1"
$env:VITE_DEPLOY_ACCESS_CODE = ""
npm run build:netlify

if (-not (Test-Path (Join-Path $Root "dist\index.html"))) {
    Write-Error "Build failed - dist/index.html missing"
}

$redirects = @(
    "/api/*  $ApiHost/api/:splat  200"
    "/*  /index.html  200"
)
$redirects | Out-File (Join-Path $Root "dist\_redirects") -Encoding ascii

$outDir = Join-Path $Root "release"
$folder = Join-Path $outDir "netlify-runsite"
$zip = Join-Path $outDir "MAHALY-NETLIFY-RUNSITE.zip"

if (Test-Path $folder) {
    try { Remove-Item $folder -Recurse -Force } catch {
        $folder = Join-Path $outDir ("netlify-runsite-" + (Get-Date -Format "HHmmss"))
    }
}
New-Item -ItemType Directory -Force -Path $folder | Out-Null
Copy-Item -Path (Join-Path $Root "dist\*") -Destination $folder -Recurse -Force

if (Test-Path $zip) {
    try { Remove-Item $zip -Force } catch {
        $zip = Join-Path $outDir ("MAHALY-NETLIFY-RUNSITE-" + (Get-Date -Format "HHmm") + ".zip")
    }
}
Compress-Archive -Path (Join-Path $folder "*") -DestinationPath $zip -CompressionLevel Optimal

$readme = "UPLOAD TO NETLIFY`r`n=================`r`nFile: MAHALY-NETLIFY-RUNSITE.zip`r`nPath: $zip`r`n`r`n1. https://app.netlify.com/drop`r`n2. Drag the ZIP`r`n3. Test: https://YOUR-SITE.netlify.app/api/v1/health/`r`n`r`nBackend: $ApiHost`r`nDatabase: Neon`r`nLogin: demo | owner@demo | demo1234"
$readme | Out-File (Join-Path $outDir "UPLOAD-NETLIFY-RUNSITE.txt") -Encoding utf8

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host ""
Write-Host "NETLIFY RUNSITE ZIP:" -ForegroundColor Green
Write-Host $zip
Write-Host "Size: $mb MB"
Write-Host "API proxy -> $ApiHost"
