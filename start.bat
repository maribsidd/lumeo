@echo off
cd /d "%~dp0backend"
start "Lumeo Backend" cmd /k "node server.js"
echo Lumeo backend started on http://localhost:3001
pause
