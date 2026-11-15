@echo off
cd /d "%~dp0"
title Stickman Rescue Dev Server
echo ===================================================================
echo   STICKMAN RESCUE: Rainbow Cloud Jumper (Dev Mode)
echo   Target URL: http://localhost:3000
echo ===================================================================
echo.
echo Freeing ports 3000 and 3001 if previously occupied...
powershell -Command "Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo Starting development server...
call pnpm run dev
pause
