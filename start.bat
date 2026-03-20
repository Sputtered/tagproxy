@echo off
cd /d "%~dp0"
title TNT Tag Proxy

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed.
    echo Download it from https://nodejs.org ^(LTS version^), then re-run this file.
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install --silent
)

node index.js
pause
