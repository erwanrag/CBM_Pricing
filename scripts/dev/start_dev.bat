@echo off
title 🚀 CBM Pricing - Start
echo ========================================
echo     Starting CBM Pricing
echo ========================================
echo.

:: 📁 Chemin racine du projet
set "PROJECT_ROOT=D:\Projet\CBM_Pricing"
cd /d %PROJECT_ROOT%
echo 📁 Racine du projet : %PROJECT_ROOT%

:: === CONFIG ===
set BACKEND_PORT=8000
set FRONTEND_PORT=5173
set SERVER_IP=127.0.0.1

:: ✅ Vérification frontend
if not exist %PROJECT_ROOT%\frontend\package.json (
    echo [ERREUR] package.json manquant dans frontend !
    pause
    exit /b
)

:: ✅ Vérification venv
if not exist %PROJECT_ROOT%\venv\Scripts\activate (
    echo [ERREUR] Environnement virtuel Python non trouvé : venv\Scripts\activate
    pause
    exit /b
)

:: 🚀 Lancer Redis si non déjà lancé
tasklist | find /i "redis-server.exe" > nul
if errorlevel 1 (
    echo 🔄 Démarrage de Redis...
    start "Redis Server" cmd /k "cd /d C:\redis && redis-server.exe redis.windows.conf"
) else (
    echo ✅ Redis déjà actif.
)

:: 🔁 Choix du mode (dev ou prod local)
set /p MODE=Mode [dev/prod] ?:

if /i "%MODE%"=="prod" (
    set "BACKEND_CMD=uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT% --workers 4"
) else (
    set "BACKEND_CMD=python -m uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT% --reload"
)

:: 🚀 Lancer backend
start "CBM Backend (%MODE%)" cmd /k "cls && cd %PROJECT_ROOT%\backend && call ..\venv\Scripts\activate && %BACKEND_CMD%"

:: 🧹 Nettoyage cache Vite (sécurité)
echo 🧹 Suppression du cache .vite et dist...
rd /s /q %PROJECT_ROOT%\frontend\.vite > nul 2>&1
rd /s /q %PROJECT_ROOT%\frontend\dist > nul 2>&1

:: 🖥️ Lancer frontend
cd /d %PROJECT_ROOT%\frontend
if /i "%MODE%"=="prod" (
    start "CBM Frontend (PROD)" cmd /k "cls && npx serve -s dist -l %FRONTEND_PORT%"
) else (
    start "CBM Frontend (DEV)" cmd /k "cls && npm run dev -- --port %FRONTEND_PORT% || pause"
)

:: 🌐 Ouvrir interfaces web automatiquement
timeout /t 5 > nul
start http://%SERVER_IP%:%BACKEND_PORT%/docs
start http://%SERVER_IP%:%FRONTEND_PORT%

:: 🔚 Retour à la racine
cd /d %PROJECT_ROOT%

echo.
echo ✅ CBM Pricing lancé en mode %MODE% sur %SERVER_IP%:%BACKEND_PORT% et %SERVER_IP%:%FRONTEND_PORT%
pause
