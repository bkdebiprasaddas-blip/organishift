@echo off
echo ================================
echo  OrganiShift Dev Launcher
echo ================================
echo.

:: Start MongoDB if not running
echo [1/4] Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo Starting MongoDB service...
    net start MongoDB 2>nul
)
echo MongoDB OK.
echo.

:: Start backend server in new window
echo [2/4] Starting API server (port 5000)...
start "OrganiShift API" cmd /c "cd /d %~dp0server && npm run dev"
echo.

:: Start frontend dev server in new window
echo [3/4] Starting React dev server (port 5173)...
start "OrganiShift Client" cmd /c "cd /d %~dp0client && npm run dev"
echo.

:: Wait for servers then open browser
echo [4/4] Waiting for servers...
echo.

:wait
timeout /t 2 /nobreak >nul
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% neq 0 goto wait
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% neq 0 goto wait

echo Servers are up! Opening browser...
start http://localhost:5173

echo.
echo ================================
echo  OrganiShift is running!
echo  API:    http://localhost:5000
echo  Client: http://localhost:5173
echo ================================
echo.
echo Press any key to stop servers...
pause >nul

:: Kill servers
taskkill /FI "WINDOWTITLE eq OrganiShift API" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq OrganiShift Client" /T /F >nul 2>&1
echo Servers stopped.
