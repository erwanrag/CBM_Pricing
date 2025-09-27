@echo off
title 🚀 Déploiement complet CBM Pricing DEV → PROD
setlocal

set PROJECT_ROOT=D:\Projet\CBM_Pricing
set DEV_BACKEND=%PROJECT_ROOT%\dev\backend
set PROD_BACKEND=%PROJECT_ROOT%\prod\backend
set DEV_FRONTEND=%PROJECT_ROOT%\dev\frontend
set PROD_FRONTEND=%PROJECT_ROOT%\prod\frontend

echo ========================================
echo 🔄 Nettoyage & copie du backend
echo ========================================
robocopy %DEV_BACKEND% %PROD_BACKEND% /MIR /XD __pycache__ tests /XF *.pyc *.log .env*
echo ✅ Backend copié


echo ➕ Copie des env prod/dev vers prod/backend
copy /Y %DEV_BACKEND%\.env.dev %PROD_BACKEND%\.env.dev
copy /Y %DEV_BACKEND%\.env.prod %PROD_BACKEND%\.env.prod

echo.
echo ========================================
echo 🔄 Nettoyage & copie du frontend (sans dist)
echo ========================================
robocopy %DEV_FRONTEND% %PROD_FRONTEND% /MIR /XD node_modules dist /XF *.log start_frontend.cmd

echo ✅ Frontend copié

echo.
echo 🔨 Build React (avec URL API PROD)
echo ========================================
cd /d %DEV_FRONTEND%

call npm install
call npm run build

echo.
echo 🧹 Suppression ancien dist (prod)
if exist %PROD_FRONTEND%\dist (
    rmdir /S /Q %PROD_FRONTEND%\dist
)

echo 🔁 Copie du dist dans prod/frontend
xcopy dist %PROD_FRONTEND%\dist /E /Y /I

echo.
echo ✅ Déploiement terminé avec succès.

:: Optionnel : lancer le serveur prod (serve)
REM serve -s %PROD_FRONTEND%\dist -l 5173

:: Optionnel : ouvrir automatiquement le site
REM start http://10.103.3.11:5173

endlocal
pause
