@echo off
title CBM Pricing V2 - Start
echo ========================================
echo     Starting CBM Pricing V2
echo ========================================
echo.

:: 📁 Chemin racine du projet
set "PROJECT_ROOT=D:\Projet\CBM_Pricing_dev"
cd /d %PROJECT_ROOT%
echo 📁 Racine du projet : %PROJECT_ROOT%

:: ✅ Vérification frontend
if not exist %PROJECT_ROOT%\frontend\package.json (
    echo [ERREUR] package.json manquant dans frontend !
    pause
    exit /b
)

:: ✅ Vérification venv
if not exist %PROJECT_ROOT%\venv\Scripts\activate (
    echo [ERREUR] Environnement virtuel Python non trouvé à l'emplacement attendu : venv\Scripts\activate
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
    set "BACKEND_CMD=uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4"
) else (
    set "BACKEND_CMD=python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
)

:: 🚀 Lancer backend
start "CBM Backend (%MODE%)" cmd /k "cls && cd %PROJECT_ROOT%\backend && call ..\venv\Scripts\activate && %BACKEND_CMD%"

:: 🧹 Nettoyage cache Vite (sécurité)
echo 🧹 Suppression du cache .vite et dist...
rd /s /q %PROJECT_ROOT%\frontend\.vite > nul 2>&1
rd /s /q %PROJECT_ROOT%\frontend\dist > nul 2>&1

:: 🖥️ Lancer frontend
cd /d %PROJECT_ROOT%\frontend
start "CBM Frontend (DEV)" cmd /k "cls && npm run dev || pause"

:: 🌐 Ouvrir interfaces web automatiquement
timeout /t 5 > nul
start http://127.0.0.1:8001/docs
start http://127.0.0.1:5174

:: 🔚 Retour à la racine
cd /d %PROJECT_ROOT%

echo.
echo ✅ CBM Pricing V2 lancé en mode %MODE% avec succès !
pause
