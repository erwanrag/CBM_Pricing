@echo off
cd /d D:\Projet\CBM_Pricing_dev
call venv\Scripts\activate
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
