# Deploy mahalyerp-api on Runsite via Public API
# Usage:
#   $env:RUNSITE_API_KEY = "ak_live_...."
#   powershell -File scripts/runsite-deploy.ps1
#
# Optional:
#   $env:RUNSITE_SERVICE_ID = "srv-wgol48hxkhovvlh8kx3x"

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

$ApiKey = $env:RUNSITE_API_KEY
$ServiceId = if ($env:RUNSITE_SERVICE_ID) { $env:RUNSITE_SERVICE_ID } else { "srv-wgol48hxkhovvlh8kx3x" }
$BaseUrl = "https://api.runsite.app"

if (-not $ApiKey) {
    Write-Error @"
RUNSITE_API_KEY missing.

Create key: Runsite Dashboard -> API Keys -> Create (scope: write)
Then run:
  `$env:RUNSITE_API_KEY = 'ak_live_...'
  powershell -File scripts/runsite-deploy.ps1
"@
}

$headers = @{
    Authorization = "Bearer $ApiKey"
    "Content-Type" = "application/json"
}

$secretsFile = Join-Path $Root "release\RUNSITE-انسخ-الأسرار.txt"
if (-not (Test-Path $secretsFile)) {
    Write-Error "Missing $secretsFile"
}

$variables = @()
Get-Content $secretsFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    $isSecret = $key -in @("DATABASE_URL", "SECRET_KEY")
    $variables += @{ key = $key; value = $value; is_secret = $isSecret }
}

Write-Host "Service: $ServiceId"
Write-Host "Setting $($variables.Count) environment variables..."

$envBody = @{ variables = $variables } | ConvertTo-Json -Depth 5
try {
    Invoke-RestMethod -Method Put -Uri "$BaseUrl/api/web-services/$ServiceId/env/bulk" -Headers $headers -Body $envBody | Out-Null
    Write-Host "Environment OK"
} catch {
    Write-Error "Env bulk failed: $($_.Exception.Message)"
}

Write-Host "Triggering deploy..."
try {
    Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/web-services/$ServiceId/deploy" -Headers $headers | Out-Null
    Write-Host "Deploy started"
} catch {
    try {
        $deployBody = '{"branch":"main"}' 
        Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/web-services/$ServiceId/deployments" -Headers $headers -Body $deployBody | Out-Null
        Write-Host "Deploy started (deployments endpoint)"
    } catch {
        Write-Error "Deploy failed: $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "Wait 5-10 min then test:"
Write-Host "https://mahalyerp-api.runsite.app/api/v1/health/"
