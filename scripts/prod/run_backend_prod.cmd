@echo off
cd /d D:\Projet\CBM_Pricing
set CBM_ENV=prod
call venv\Scripts\activate
cd prod\backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
