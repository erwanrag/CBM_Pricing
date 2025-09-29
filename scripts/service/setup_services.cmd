@echo off
title ⚙️ Setup CBM Pricing Services

:: ==== PARAMÈTRES PAR DÉFAUT ====
set BACKEND_PORT=8000
set FRONTEND_PORT=5173

:: ==== SI DES PORTS SONT PASSÉS EN ARGUMENTS ====
if not "%1"=="" set BACKEND_PORT=%1
if not "%2"=="" set FRONTEND_PORT=%2

echo ========================================
echo 🚀 Configuration des services CBM Pricing
echo Backend port  : %BACKEND_PORT%
echo Frontend port : %FRONTEND_PORT%
echo ========================================

:: ==== SUPPRESSION ANCIENS SERVICES ====
sc stop CBM_Pricing_BackEnd >nul 2>&1
sc delete CBM_Pricing_BackEnd >nul 2>&1
sc stop CBM_Pricing_FrontEnd >nul 2>&1
sc delete CBM_Pricing_FrontEnd >nul 2>&1

:: ==== RECREATION SERVICES ====

:: Backend
sc create CBM_Pricing_BackEnd binPath= "cmd.exe /c D:\Projet\CBM_Pricing\scripts\start_backend.cmd %BACKEND_PORT%" start= auto
sc description CBM_Pricing_BackEnd "CBM Pricing API (FastAPI) sur port %BACKEND_PORT%"

:: Frontend
sc create CBM_Pricing_FrontEnd binPath= "cmd.exe /c D:\Projet\CBM_Pricing\scripts\start_frontend.cmd %FRONTEND_PORT%" start= auto
sc description CBM_Pricing_FrontEnd "CBM Pricing Frontend (React build) sur port %FRONTEND_PORT%"

echo ✅ Services créés avec succès !
pause
