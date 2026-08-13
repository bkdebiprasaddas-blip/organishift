@echo off
setlocal enabledelayedexpansion
title OrganiShift Launcher
cd /d "%~dp0"

set "APIMIN=5050"
set "APIMAX=5150"
set "WEBMIN=5173"
set "WEBMAX=5200"

echo ==============================================
echo   OrganiShift - one-click start
echo ==============================================
echo.

where node > nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js ^(v20+^) and run this file again.
  pause
  exit /b 1
)

REM ---------- 0. Optional: pull latest code first ----------
REM   Usage:  OrganiShift.bat --pull
set "DO_PULL="
for %%A in (%*) do if /i "%%~A"=="--pull" set "DO_PULL=1"
if defined DO_PULL (
  echo [refresh] Pulling latest changes from the remote...
  git pull --ff-only
  if errorlevel 1 echo [WARN] git pull did not succeed - continuing with the current code.
  echo.
)

REM ---------- 1. Already running? Reuse the persisted ports ----------
set "SAVED_API="
set "SAVED_WEB="
if exist ".organishift-ports" (
  for /f "usebackq delims=" %%l in (".organishift-ports") do (
    if not defined SAVED_API (
      set "SAVED_API=%%l"
    ) else if not defined SAVED_WEB (
      set "SAVED_WEB=%%l"
    )
  )
)
if defined SAVED_API if defined SAVED_WEB (
  call :pingapi !SAVED_API!
  set "API_UP=!errorlevel!"
  call :pingweb !SAVED_WEB!
  set "WEB_UP=!errorlevel!"
  if "!API_UP!"=="0" if "!WEB_UP!"=="0" (
    echo OrganiShift is already running - opening the app...
    start "" http://localhost:!SAVED_WEB!
    goto :done
  )
)

REM ---------- 2. Clear stale OrganiShift processes on our port ranges ----------
call :clearstale
if errorlevel 1 exit /b 1
if defined STALE_KILLED (
  echo [start] Waiting for the ports to be released...
  timeout /t 2 /nobreak > nul
)

REM ---------- 3. Refresh dependencies (only when package files change) ----------
call :ensure_deps
if errorlevel 1 (
  echo.
  echo [WARN] Dependency install failed. Fix the error above and run again.
  pause
  exit /b 1
)

REM ---------- 4. Refresh seed data (only when seed.js changes) ----------
call :ensure_seed
if errorlevel 1 (
  echo.
  echo [WARN] Seeding failed. Is the MongoDB service running?
  echo        Start MongoDB and run this file again.
  pause
  exit /b 1
)

REM ---------- 5. Auto-pick free ports (no conflicts with other projects) ----------
call :pickport %APIMIN% %APIMAX%
if errorlevel 1 (
  echo [ERROR] No free API port in %APIMIN%-%APIMAX%. Close something and run again.
  pause
  exit /b 1
)
set "APIPORT=%PORTPICK%"
call :pickport %WEBMIN% %WEBMAX%
if errorlevel 1 (
  echo [ERROR] No free web port in %WEBMIN%-%WEBMAX%. Close something and run again.
  pause
  exit /b 1
)
set "WEBPORT=%PORTPICK%"
> ".organishift-ports" echo %APIPORT%
>> ".organishift-ports" echo %WEBPORT%

echo [start] API  -^> http://localhost:%APIPORT%
echo [start] App  -^> http://localhost:%WEBPORT%

REM ---------- 6. Start the stack with the chosen ports ----------
set "PORT=%APIPORT%"
set "CLIENT_ORIGIN=http://localhost:%WEBPORT%"
set "ORGANISHIFT_API_PORT=%APIPORT%"
set "ORGANISHIFT_WEB_PORT=%WEBPORT%"
start "OrganiShift - API + Client" /d "%~dp0" cmd /k "npm run dev"

REM ---------- 7. Wait for BOTH services, then open the browser ----------
echo [start] Waiting for the API and the app to come up...
set /a tries=0
:waitloop
set /a tries+=1
call :pingapi %APIPORT%
set "A=!errorlevel!"
call :pingweb %WEBPORT%
set "W=!errorlevel!"
if "!A!"=="0" if "!W!"=="0" goto :openbrowser
if !tries! geq 60 (
  echo.
  echo [WARN] The services did not respond in time. Check the "OrganiShift - API + Client"
  echo        window for errors ^(MongoDB not running, etc.^).
  goto :done
)
timeout /t 1 /nobreak > nul
goto :waitloop

:openbrowser
echo [start] OrganiShift is up - opening your browser...
start "" http://localhost:%WEBPORT%
goto :done

:done
echo.
echo The app keeps running in the "OrganiShift - API + Client" window.
echo Use Ctrl+C in that window to stop it cleanly ^(avoid the X button,
echo which can leave the server running in the background^).
echo You can close this window now.
echo.
pause
exit /b 0

REM =================== helpers ===================

:pingapi
REM %1 = api port
curl -sf --max-time 3 -o nul http://localhost:%1/api/health > nul 2>&1
exit /b %errorlevel%

:pingweb
REM %1 = web port
curl -sf --max-time 3 -o nul http://localhost:%1 > nul 2>&1
exit /b %errorlevel%

:pickport
REM %1 = min, %2 = max ; sets PORTPICK to the first free TCP port, errorlevel 1 if none
set "PORTPICK="
for /f %%p in ('powershell -NoProfile -Command "for($p=%1;$p -le %2;$p++){if(-not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)){write $p;break}}"') do set "PORTPICK=%%p"
if not defined PORTPICK exit /b 1
exit /b 0

:clearstale
REM Kills orphaned OrganiShift processes holding any port in our ranges.
REM Foreign processes are left alone - pickport will just use another port.
set "STALE_KILLED="
for /f "usebackq delims=" %%r in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0OrganiShift-cleanup.ps1"`) do (
  for /f "tokens=2 delims=:" %%i in ("%%r") do (
    echo [start] Stopping stale OrganiShift process ^(PID %%i^)...
    taskkill /PID %%i /T /F > nul 2>&1
    set "STALE_KILLED=1"
  )
)
exit /b 0

:ensure_deps
echo [setup] Checking dependencies ^(root/server/client^)...
call :check_install .
if errorlevel 1 exit /b 1
call :check_install server
if errorlevel 1 exit /b 1
call :check_install client
if errorlevel 1 exit /b 1
exit /b 0

:check_install
REM %1 = dir with package.json; installs only if package files changed
set "PKGDIR=%~1"
if not exist "%PKGDIR%\node_modules\.install-stamp" goto :doinstall
powershell -NoProfile -Command "$pkg=Get-Item '%PKGDIR%\package.json';$lock=Get-Item '%PKGDIR%\package-lock.json' -ErrorAction SilentlyContinue;$stamp=Get-Item '%PKGDIR%\node_modules\.install-stamp' -ErrorAction SilentlyContinue;if(-not $stamp){exit 1};if($pkg.LastWriteTime -gt $stamp.LastWriteTime){exit 1};if($lock -and $lock.LastWriteTime -gt $stamp.LastWriteTime){exit 1};exit 0"
if not errorlevel 1 goto :eof
:doinstall
echo [setup] Installing dependencies in "%PKGDIR%"...
pushd "%PKGDIR%"
call npm install --no-fund --no-audit
if errorlevel 1 (
  popd
  exit /b 1
)
popd
type nul > "%PKGDIR%\node_modules\.install-stamp"
exit /b 0

:ensure_seed
if exist "server\.seeded" (
  powershell -NoProfile -Command "$seed=Get-Item 'server\src\seed\seed.js';$mark=Get-Item 'server\.seeded';if($seed.LastWriteTime -gt $mark.LastWriteTime){exit 1}else{exit 0}"
  if not errorlevel 1 goto :eof
)
echo [setup] Seeding demo data ^(first run or seed changed^)...
pushd server
call npm run seed
if errorlevel 1 (
  popd
  exit /b 1
)
popd
type nul > "server\.seeded"
exit /b 0
