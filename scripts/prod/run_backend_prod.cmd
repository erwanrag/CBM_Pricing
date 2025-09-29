@echo off
set "PROJECT_ROOT=%~dp0"
cd /d %PROJECT_ROOT%
set CBM_ENV=prod
call venv\Scripts\activate
cd prod\backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
