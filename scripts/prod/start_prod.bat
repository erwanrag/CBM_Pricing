@echo off
title CBM Pricing - PROD Start
echo ========================================
echo      Starting CBM Pricing PROD
echo ========================================
echo.

set CBM_ENV=prod
set BACKEND_PORT=8000
set FRONTEND_PORT=5173
set SERVER_IP=10.103.3.11

cd /d D:\Projet\CBM_Pricing
set "PROJECT_ROOT=D:\Projet\CBM_Pricing"

if not exist frontend\dist (
    echo [ERREUR] Le dossier build React 'dist' est manquant dans frontend !
    pause
    exit /b
)

tasklist | find /i "redis-server.exe" > nul
if errorlevel 1 (
    echo 🔄 Démarrage de Redis...
    start "Redis Server" cmd /k "cd /d C:\redis && redis-server.exe redis.windows.conf"
) else (
    echo ✅ Redis déjà actif.
)

start "CBM Backend (PROD)" cmd /k "cd /d %PROJECT_ROOT%\backend && call ..\venv\Scripts\activate && python -m uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT%"

cd frontend
start "CBM Frontend (PROD)" cmd /k "npx serve -s dist -l %FRONTEND_PORT%"

timeout /t 5 > nul
start http://%SERVER_IP%:%BACKEND_PORT%/docs
start http://%SERVER_IP%:%FRONTEND_PORT%

echo.
echo ✅ CBM Pricing PROD lancé avec succès !
pause
