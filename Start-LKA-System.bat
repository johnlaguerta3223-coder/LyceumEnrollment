@echo off
title Lyceum ng Kabataan Academy - System Launcher
echo ================================================================
echo   Starting Lyceum ng Kabataan Academy Online Enrollment System
echo ================================================================
echo.

echo [1/2] Starting Backend Server (FastAPI on Port 8000)...
start "LKA Backend Server" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe -m uvicorn app.main:app --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Server (React on Port 3000)...
start "LKA Frontend Server" cmd /k "cd /d "%~dp0frontend" && npm.cmd start"

echo.
echo ================================================================
echo   System is launching! Your browser will open http://localhost:3000
echo   automatically in a few seconds.
echo ================================================================
timeout /t 5 >nul
exit
