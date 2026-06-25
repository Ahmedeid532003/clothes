$DeployEnv = Join-Path (Split-Path $PSScriptRoot -Parent) "deploy\vps.env"
$ports = @()
Get-Content $DeployEnv | ForEach-Object {
    if ($_ -match '^\s*MAHALY_(WEB|API)_PORT=(\d+)') {
        $ports += [int]$matches[2]
    }
}
if (-not $ports) { $ports = @(8787, 8788) }

Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped PID $($_.OwningProcess) on port $($_.LocalPort)"
    }
