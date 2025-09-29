@echo off
title 🔄 Restart CBM Pricing Services

echo ========================================
echo 🔄 Redémarrage des services CBM Pricing
echo ========================================

sc stop CBM_Pricing_BackEnd
sc stop CBM_Pricing_FrontEnd

timeout /t 5 > nul

sc start CBM_Pricing_BackEnd
sc start CBM_Pricing_FrontEnd

echo.
echo ✅ Services backend & frontend redémarrés avec succès !
pause
