@echo off
set PORT=%1
if "%PORT%"=="" set PORT=8000

cd /d D:\Projet\CBM_Pricing
call venv\Scripts\activate
cd backend
uvicorn app.main:app --host 0.0.0.0 --port %PORT% --workers 4
