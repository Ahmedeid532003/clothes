@echo off
cd /d "%~dp0.."
set VITE_API_URL=http://127.0.0.1:8000/api/v1
set VITE_DEPLOY_ACCESS_CODE=
call npm run dev
