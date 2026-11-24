@echo off
title Stop Lyceum ng Kabataan Academy System
echo Stopping LKA Backend and Frontend servers...
taskkill /FI "WINDOWTITLE eq LKA Backend Server*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LKA Frontend Server*" /T /F >nul 2>&1
echo Done! All LKA servers have been stopped.
timeout /t 2 >nul
exit
