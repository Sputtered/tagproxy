@echo off
cd /d "%~dp0"
title TNT Tag Proxy

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  Node.js is required but was not found.
    echo  Download the LTS version from https://nodejs.org
    echo  then re-run this file.
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install --silent
    if %errorlevel% neq 0 (
        echo Dependency installation failed. Try running as administrator.
        pause
        exit /b 1
    )
)

echo.
echo  TNT Tag Proxy
echo  Connect to localhost in Minecraft 1.8.9
echo  Type /config in-game to adjust settings.
echo.

node index.js
pause
