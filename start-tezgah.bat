@echo off
title TEZGAH - sunucular calisiyor (bu pencereyi kapatma)
cd /d "%~dp0"
echo TEZGAH baslatiliyor (server:3001 + web:5173)...
echo Tarayicida: http://localhost:5173
echo Kapatmak icin bu pencereyi kapatin ya da Ctrl+C basin.
echo.
call npm run dev
pause
