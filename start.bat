@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Ma7alyERP

echo.
echo ============================================
echo   Ma7alyERP - Starting Backend + Frontend
echo ============================================
echo.

powershell -NoProfile -Command "$ports=8000,3000;foreach($p in $ports){$c=Get-NetTCPConnection -LocalPort $p -EA SilentlyContinue|Select -First 1;if($c){Stop-Process -Id $c.OwningProcess -Force -EA SilentlyContinue}}"

if not exist "backend\.venv\Scripts\python.exe" (
  echo ERROR: backend\.venv\Scripts\python.exe not found.
  echo.
  echo Setup:
  echo   cd backend
  echo   python -m venv .venv
  echo   .venv\Scripts\pip install -r requirements.txt
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Running npm install...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo [1/2] Starting backend on port 8000...
start "Ma7alyERP Backend" cmd /k "%~dp0run-backend.bat"

timeout /t 2 /nobreak >nul

echo [2/2] Starting frontend on port 3000...
start "Ma7alyERP Frontend" cmd /k "%~dp0run-frontend.bat"

echo.
echo Started in separate windows:
echo   Backend:  http://127.0.0.1:8000
echo   Frontend: http://localhost:3000
echo   Admin:    http://127.0.0.1:8000/admin/
echo.
echo Close the Backend and Frontend windows to stop servers.
echo.
pause
