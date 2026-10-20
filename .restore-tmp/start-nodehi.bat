@echo off
setlocal
cd /d "%~dp0"

rem ============================================================
rem  Nodehi - start the dev server (if needed) and open the site
rem  Double-click this file to see the live site.
rem  Server runs hidden; logs: .freebuff\nodehi-dev.log(.err)
rem ============================================================

set "PORT=3000"
set "URL=http://127.0.0.1:%PORT%/"
set "LOGDIR=%~dp0.freebuff"
set "LOG=%LOGDIR%\nodehi-dev.log"
set "LOGERR=%LOGDIR%\nodehi-dev.log.err"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

rem 1) If the site already answers, just open the browser.
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto :open

echo Starting Nodehi dev server on port %PORT% (first start takes a bit) ...

rem 2) Start the server detached and hidden; stdout/stderr to separate files.
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','-p','%PORT%' -WorkingDirectory '%~dp0.' -RedirectStandardOutput '%LOG%' -RedirectStandardError '%LOGERR%' -WindowStyle Hidden -PassThru).Id" >nul

rem 3) Wait until the site answers (max ~2 minutes).
set /a tries=0
:wait
timeout /t 2 /nobreak >nul
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto :open
set /a tries+=1
if %tries% lss 60 goto :wait

echo Server did not come up in time. Check the logs:
echo   %LOG%
echo   %LOGERR%
pause
goto :eof

:open
start "" "%URL%"
exit /b 0
