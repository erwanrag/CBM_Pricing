@echo off
echo ===============================
echo 🔴 Arrêt CBM Pricing V2
echo ===============================

:: Fermer Redis
echo 🔄 Fermeture de Redis...
taskkill /F /IM redis-server.exe >nul 2>&1

:: Fermer Serve (React statique)
echo 🔄 Fermeture du serveur React (node.exe)...
taskkill /F /IM node.exe >nul 2>&1

:: Fermer Backend (FastAPI/Uvicorn sur 8001)
echo 🔄 Fermeture du backend (port 8001)...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":8001" ^| find "LISTENING"') do (
    taskkill /PID %%a /F
)

:: (Optionnel) Fermer frontend buildé sur 3010 et dev sur 5174
echo 🔄 Fermeture éventuelle du frontend sur 3010 et 5174...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":3010" ^| find "LISTENING"') do (
    taskkill /PID %%a /F
)
for /f "tokens=5" %%a in ('netstat -ano ^| find ":5174" ^| find "LISTENING"') do (
    taskkill /PID %%a /F
)

echo.
echo ✅ CBM Pricing V2 arrêté proprement !
pause
