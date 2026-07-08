@echo off
setlocal EnableDelayedExpansion
title TEZGAH - baslatici
cd /d "%~dp0"

echo ============================================
echo   TEZGAH baslatici
echo ============================================
echo.

echo [1/3] Mevcut durum kontrol ediliyor...
set "HC=000"
for /f %%c in ('curl -s -m 2 -o nul -w "%%{http_code}" "http://localhost:3001/api/health" 2^>nul') do set "HC=%%c"
set "WC=000"
for /f %%c in ('curl -s -m 2 -o nul -w "%%{http_code}" "http://localhost:5173/" 2^>nul') do set "WC=%%c"

if "!HC!"=="200" if "!WC!"=="200" (
  echo.
  echo   Sunucu 3001: OK - zaten calisiyor
  echo   Web    5173: OK - zaten calisiyor
  echo.
  echo   Tarayicida: http://localhost:5173
  echo.
  pause
  exit /b 0
)

echo   Calismiyor ya da yarim kalmis - temizleniyor...
echo.
echo [2/3] Onceki takilmis surecler temizleniyor...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*\tasarim\*' } | ForEach-Object { Write-Host ('  - PID ' + $_.ProcessId + ' sonlandiriliyor'); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Sunucular yeni pencerede baslatiliyor...
echo   (Bu yeni pencereyi acik tutun - [server] ve [web] loglari orada gorunur)
start "TEZGAH - server+web loglari" cmd /k "npm run dev"

echo   Saglik kontrolu yapiliyor (en fazla 30 sn)...
set "OK3001=0"
set "OK5173=0"
for /L %%i in (1,1,30) do (
  if !OK3001!==0 (
    set "HC="
    for /f %%c in ('curl -s -m 2 -o nul -w "%%{http_code}" "http://localhost:3001/api/health" 2^>nul') do set "HC=%%c"
    if "!HC!"=="200" set "OK3001=1"
  )
  if !OK5173!==0 (
    set "WC="
    for /f %%c in ('curl -s -m 2 -o nul -w "%%{http_code}" "http://localhost:5173/" 2^>nul') do set "WC=%%c"
    if "!WC!"=="200" set "OK5173=1"
  )
  if !OK3001!==1 if !OK5173!==1 goto :sonuc
  <nul set /p ".=."
  timeout /t 1 /nobreak >nul
)

:sonuc
echo.
echo.
echo ============================================
echo   SONUC
echo ============================================
if "!OK3001!"=="1" (
  echo   Sunucu 3001: OK
) else (
  echo   Sunucu 3001: BASARISIZ - "TEZGAH - server+web loglari" penceresindeki [server] satirlarini okuyun.
  echo                Port 3001 baska bir uygulama tarafindan kullaniliyor olabilir.
)
if "!OK5173!"=="1" (
  echo   Web    5173: OK  - http://localhost:5173
) else (
  echo   Web    5173: BASARISIZ - ayni penceredeki [web] satirlarini kontrol edin.
)
echo.
if "!OK3001!"=="1" if "!OK5173!"=="1" (
  echo   Tarayicida acabilirsiniz: http://localhost:5173
) else (
  echo   Sorun devam ederse: server+web loglari penceresini kapatip bu dosyayi
  echo   tekrar calistirin, ya da bilgisayari yeniden baslatin.
)
echo.
pause
exit /b 0
