# رفع التحديثات إلى VPS وإعادة تشغيل الباك إند + الفرونت
# الاستخدام:
#   $env:VPS_PASSWORD = 'YOUR_WINDOWS_PASSWORD'
#   powershell -ExecutionPolicy Bypass -File scripts/push-vps-deploy.ps1
param(
    [string]$VpsIp = "128.140.127.179",
    [string]$VpsUser = "Administrator",
    [string]$RemoteRoot = "C:\Users\Administrator\Downloads\Clothes"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$DeployEnv = Join-Path $Root "deploy\vps.env"

if (Test-Path $DeployEnv) {
    Get-Content $DeployEnv | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($name -eq 'VPS_IP' -and $value) { $VpsIp = $value }
        }
    }
}

if (-not $env:VPS_PASSWORD) {
    Write-Error "Set VPS Windows password first: `$env:VPS_PASSWORD = '...'"
}

Write-Host "=== Ma7alyErp VPS Push ===" -ForegroundColor Cyan
Write-Host "Target: $VpsIp -> $RemoteRoot"

# 1) Build frontend for VPS API
$apiPort = "8788"
$env:VITE_API_URL = "http://${VpsIp}:${apiPort}/api/v1"
$env:VITE_DEPLOY_ACCESS_CODE = ""
Set-Location $Root
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run build
if (-not (Test-Path (Join-Path $Root "dist\index.html"))) {
    Write-Error "Frontend build failed"
}

# 2) Connect SMB admin share
$share = "\\$VpsIp\C$"
cmd /c "net use $share /delete /y" 2>$null | Out-Null
cmd /c "net use $share `"$env:VPS_PASSWORD`" /user:$VpsUser" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "SMB login failed — check VPS_PASSWORD and firewall"
}

$remote = Join-Path $share ($RemoteRoot -replace '^C:\\', '' -replace '\\', '\')
if (-not (Test-Path $remote)) {
    Write-Error "Remote project folder not found: $RemoteRoot"
}

Write-Host "Syncing code..." -ForegroundColor Yellow
$excludeDirs = @('node_modules', '.venv', '.git', 'release', '.cursor', '__pycache__')
$robocopyArgs = @($Root, $remote, '/MIR', '/R:2', '/W:3', '/NFL', '/NDL', '/NJH', '/NJS', '/nc', '/ns', '/np')
foreach ($d in $excludeDirs) { $robocopyArgs += @('/XD', $d) }
& robocopy @robocopyArgs | Out-Null
# robocopy exit 0-7 = success
if ($LASTEXITCODE -gt 7) {
    Write-Error "robocopy failed with code $LASTEXITCODE"
}

# Copy built dist separately (excluded from MIR source sync above — push fresh build)
$remoteDist = Join-Path $remote "dist"
New-Item -ItemType Directory -Force -Path $remoteDist | Out-Null
& robocopy (Join-Path $Root "dist") $remoteDist '/MIR' '/R:2' '/W:3' '/NFL' '/NDL' '/NJH' '/NJS' '/nc' '/ns' '/np' | Out-Null

Write-Host "Running remote migrate + restart..." -ForegroundColor Yellow
$sec = ConvertTo-SecureString $env:VPS_PASSWORD -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($VpsUser, $sec)
try {
    Set-Item WSMan:\localhost\Client\TrustedHosts -Value $VpsIp -Force -Concatenate -ErrorAction SilentlyContinue
    Invoke-Command -ComputerName $VpsIp -Credential $cred -ScriptBlock {
        param($RemoteRoot)
        Set-Location $RemoteRoot
        Set-Location backend
        & .\.venv\Scripts\python.exe manage.py migrate --noinput
        & .\.venv\Scripts\python.exe manage.py migrate_all_tenants 2>$null
        & .\.venv\Scripts\python.exe manage.py collectstatic --noinput
        Set-Location $RemoteRoot
        & powershell -ExecutionPolicy Bypass -File .\scripts\start-mahaly-vps.ps1
    } -ArgumentList $RemoteRoot
} catch {
    Write-Host "WinRM failed — code synced. On VPS run manually:" -ForegroundColor Yellow
    Write-Host "  cd $RemoteRoot"
    Write-Host "  .\scripts\deploy-update.ps1"
}

cmd /c "net use $share /delete /y" 2>$null | Out-Null

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "App: http://${VpsIp}:8787"
Write-Host "API: http://${VpsIp}:8788/api/v1"
