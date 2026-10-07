@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo     Stopping BUBALA...
echo ============================================

docker info >nul 2>&1
if not errorlevel 1 goto docker_running
echo Docker is not running - there is nothing to stop.
goto done

:docker_running
docker compose down
if not errorlevel 1 goto stopped
echo WARNING: "docker compose down" reported a problem.
goto done

:stopped
echo.
echo BUBALA stopped. Nothing is running any more.
echo Your data is safe in the Docker volume and will still be
echo there tomorrow when you start it again.

:done
echo.
echo NOTE: Docker Desktop itself stays in the tray (about 300 MB of RAM).
echo       To quit it completely: right-click the Docker whale icon in the
echo       tray and choose "Quit Docker Desktop".
echo.
pause
endlocal
exit /b 0
