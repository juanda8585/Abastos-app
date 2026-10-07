@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo     Starting BUBALA...
echo ============================================

rem ---------------------------------------------------------------
rem 1. Make sure Docker Desktop is running
rem ---------------------------------------------------------------
docker info >nul 2>&1
if not errorlevel 1 goto docker_ready

if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" goto docker_missing
echo Docker Desktop is not running - starting it, please wait...
start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"

set /a wait_count=0
:wait_docker
ping -n 4 127.0.0.1 >nul
docker info >nul 2>&1
if not errorlevel 1 goto docker_ready
set /a wait_count+=1
if %wait_count% lss 40 goto wait_docker
echo ERROR: Docker Desktop did not start in time.
goto fail

:docker_missing
echo ERROR: Docker Desktop was not found at:
echo        %ProgramFiles%\Docker\Docker\Docker Desktop.exe
echo.
echo Install Docker Desktop first - see DEPLOYMENT.md
goto fail

rem ---------------------------------------------------------------
rem 2. Start the containers (the first run also builds them)
rem ---------------------------------------------------------------
:docker_ready
echo Starting containers (first run also builds them)...
docker compose up -d --build
if not errorlevel 1 goto compose_ok
echo ERROR: "docker compose up" failed.
goto fail
:compose_ok

rem ---------------------------------------------------------------
rem 3. Wait until the application really answers before opening it
rem ---------------------------------------------------------------
where curl >nul 2>&1
if not errorlevel 1 goto curl_ok
rem No curl available: give it a moment anyway, then open the browser.
ping -n 9 127.0.0.1 >nul
goto open

:curl_ok
echo Waiting for the application to be ready...
set /a wait_count=0
:wait_api
ping -n 3 127.0.0.1 >nul
curl -s -f -o nul http://localhost:3000/api/employees
if not errorlevel 1 goto api_ready
set /a wait_count+=1
if %wait_count% lss 60 goto wait_api
echo WARNING: the API is not answering yet - the page may need a refresh.
goto open

:api_ready
echo OK: application is ready.

rem ---------------------------------------------------------------
rem 4. Open the browser and show how to reach it from other PCs
rem ---------------------------------------------------------------
:open
echo.
echo    Open on THIS PC:        http://localhost/
rem Print the real network IPs (skip virtual adapters such as WSL/Docker,
rem which are NOT reachable from other computers on the network)
powershell -NoProfile -Command "$ips = Get-NetIPConfiguration | Where-Object { $_.NetAdapter -and $_.NetAdapter.Status -eq 'Up' -and -not $_.NetAdapter.Virtual } | ForEach-Object { $_.IPv4Address.IPAddress }; $ips = @($ips | Where-Object { $_ -and $_ -notlike '127.*' -and $_ -notlike '169.254.*' }); if ($ips.Count -eq 0) { $ips = @(Get-NetIPAddress -AddressFamily IPv4 | ForEach-Object { $_.IPAddress } | Where-Object { $_ -notlike '127.*' -and $_ -notlike '169.254.*' }) }; $ips | ForEach-Object { Write-Host ('    Open from ANOTHER PC:   http://' + $_ + '/') }"
echo.
start "" "http://localhost/"
endlocal
exit /b 0

:fail
echo.
echo See the "Troubleshooting" section of DEPLOYMENT.md
pause
endlocal
exit /b 1
