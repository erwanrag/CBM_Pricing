@echo off
set PROJECT_ROOT=D:\Projet\CBM_Pricing

cd /d %PROJECT_ROOT%
call venv\Scripts\activate

cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

