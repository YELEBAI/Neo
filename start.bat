@echo off
title NeoTavern
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo   ============================================
echo          NeoTavern  -  一键启动
echo   ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js required. Install from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do echo   Node: %%i

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo   [INFO] Installing pnpm...
    call npm install -g pnpm
)

if not exist "node_modules\" (
    echo   [INFO] Installing dependencies...
    call pnpm install
    echo.
)

echo   Starting desktop app...
echo.

call pnpm tauri dev

pause
