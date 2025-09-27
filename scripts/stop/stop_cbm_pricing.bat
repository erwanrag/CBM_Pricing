@echo off
echo ========================================
echo    Fermeture de CBM Pricing (Production)
echo ========================================
echo.

:: Fermer Redis
taskkill /F /IM redis-server.exe

:: Fermer Uvicorn (FastAPI)
taskkill /F /IM uvicorn.exe

:: Fermer le serveur frontend (serve)
taskkill /F /IM node.exe

echo.
echo ✅ Tous les services CBM ont été arrêtés.
echo ========================================
pause
