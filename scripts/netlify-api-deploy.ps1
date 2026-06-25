# Deploy dist/ to Netlify via REST API (no netlify-cli required)
# Requires: $env:NETLIFY_AUTH_TOKEN from https://app.netlify.com/user/applications
param(
    [string]$SiteName = "mahalyerp",
    [string]$Dir = "dist"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$token = $env:NETLIFY_AUTH_TOKEN
if (-not $token) {
    Write-Error "Set NETLIFY_AUTH_TOKEN first (Netlify → User settings → Applications → Personal access tokens)"
}

if (-not (Test-Path "$Dir\index.html")) {
    Write-Host "Building frontend..."
    npm run build:netlify
}

$zipPath = Join-Path $env:TEMP "mahalyerp-deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$Dir\*" -DestinationPath $zipPath

$headers = @{
    Authorization = "Bearer $token"
}

# Find or create site
$sites = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites" -Headers $headers
$site = $sites | Where-Object { $_.name -eq $SiteName } | Select-Object -First 1
if (-not $site) {
  Write-Host "Creating site: $SiteName"
  $site = Invoke-RestMethod -Method Post -Uri "https://api.netlify.com/api/v1/sites" `
    -Headers $headers -ContentType "application/json" `
    -Body (@{ name = $SiteName } | ConvertTo-Json)
}

Write-Host "Deploying to $($site.ssl_url) ..."
$deploy = Invoke-RestMethod -Method Post `
  -Uri "https://api.netlify.com/api/v1/sites/$($site.id)/deploys" `
  -Headers $headers -ContentType "application/zip" `
  -InFile $zipPath

Write-Host "Deploy ID: $($deploy.id)"
Write-Host "Production URL: $($site.ssl_url)"
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
