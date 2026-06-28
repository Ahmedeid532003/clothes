@echo off
cd /d "%~dp0..\backend"
set DATABASE_URL=
set CLOUD_SHARED_DB=
set DEBUG=True
set ALLOWED_HOSTS=localhost,127.0.0.1
.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
