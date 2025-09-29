@echo off
set PORT=%1
if "%PORT%"=="" set PORT=5173

cd /d D:\Projet\CBM_Pricing\frontend
serve -s dist -l %PORT%