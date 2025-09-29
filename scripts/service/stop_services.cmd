@echo off
title ⏹ Stop CBM Pricing Services

echo ========================================
echo ⏹ Arrêt des services CBM Pricing
echo ========================================

sc stop CBM_Pricing_BackEnd
sc stop CBM_Pricing_FrontEnd

echo.
echo ✅ Services backend & frontend arrêtés avec succès !
pause
