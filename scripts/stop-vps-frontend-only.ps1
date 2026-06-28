# إيقاف فرونت VPS فقط (منفذ 8787) — يُشغَّل على السيرفر نفسه
# يبقي الباك إند + الداتابيز على 8788 لـ Netlify proxy
$ErrorActionPreference = "Stop"
$DeployEnv = Join-Path (Split-Path $PSScriptRoot -Parent) "deploy\vps.env"
$webPort = 8787
Get-Content $DeployEnv -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_ -match '^\s*MAHALY_WEB_PORT=(\d+)') { $webPort = [int]$matches[1] }
}

Get-NetTCPConnection -LocalPort $webPort -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped frontend on port $webPort (PID $($_.OwningProcess))"
    }

Write-Host ""
Write-Host "Frontend 8787 stopped. API still on 8788 for Netlify." -ForegroundColor Green
Write-Host "Do NOT stop port 8788 until backend is migrated elsewhere."
