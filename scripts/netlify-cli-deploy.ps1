# Netlify deploy using cached CLI (no npm install needed)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root
$env:NODE_OPTIONS = "--use-system-ca"

$cli = "C:\Users\DELL\AppData\Local\npm-cache\_npx\da5c1b6ea715e8b4\node_modules\netlify-cli\bin\run.js"
if (-not (Test-Path $cli)) {
    Write-Error "netlify-cli not found in npm cache. Run: npx netlify-cli login"
}

if (-not (Test-Path "dist\index.html")) {
    npm run build:netlify
}

node $cli deploy --prod --dir=dist --message "Ma7alyErp deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
