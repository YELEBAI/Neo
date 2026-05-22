@echo off
title NeoTavern Demo
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo   ============================================
echo         NeoTavern Demo Launcher
echo   ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js is required.
    echo   Install from https://nodejs.org
    pause
    exit /b 1
)

:: Check pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo   [WARN] pnpm not found, installing via npm...
    call npm install -g pnpm
)

:: Install deps if missing
if not exist "node_modules\" (
    echo   [INFO] Installing dependencies...
    call pnpm install
)

:: Check Rust
set HAS_RUST=0
where rustc >nul 2>&1
if %errorlevel% equ 0 set HAS_RUST=1

:: Menu
echo.
echo   [1] Web Dev Server (browser)
echo   [2] Tauri Desktop App (native window)
if %HAS_RUST% equ 0 echo       ^(Rust not installed^)
echo   [3] Install Rust (one-time, for Tauri)
echo   [4] Run Tests
echo   [5] Quit
echo.
set /p choice="   Choose [1/2/3/4/5]: "

:: Option 3: Auto-Install Rust
if "%choice%"=="3" (
    if %HAS_RUST% equ 1 (
        echo.
        echo   Rust is already installed.
        pause
        goto end
    )
    echo.
    echo   ============================================
    echo   Installing Rust (may take 2-3 minutes)
    echo   ============================================
    echo.

    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        echo   Using winget to install Rust...
        winget install --id Rustlang.Rustup --silent --accept-source-agreements --accept-package-agreements
        if %errorlevel% equ 0 goto rust_done
    )

    echo   Downloading rustup-init.exe...
    powershell -Command "Invoke-WebRequest -Uri 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe' -OutFile '%TEMP%\rustup-init.exe' -UseBasicParsing"
    if %errorlevel% neq 0 (
        echo   [ERROR] Download failed.
        echo   Manual install: https://rustup.rs
        pause
        goto end
    )
    echo   Running installer (silent)...
    "%TEMP%\rustup-init.exe" -y --default-toolchain stable
    del "%TEMP%\rustup-init.exe" 2>nul

    :rust_done
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
    where rustc >nul 2>&1
    if %errorlevel% equ 0 (
        set HAS_RUST=1
        echo   [OK] Rust installed successfully.
    ) else (
        echo   [WARN] Installed but PATH not updated.
        echo   Please restart terminal and re-run launch.bat
        pause
        goto end
    )
)

:: Option 1: Web Dev Server
if "%choice%"=="1" (
    echo.
    echo   Starting NeoTavern Demo...
    echo   Open http://localhost:1420 in browser
    echo   Press Ctrl+C to stop
    echo.
    call pnpm dev
    goto end
)

:: Option 2: Tauri Desktop
if "%choice%"=="2" (
    if %HAS_RUST% equ 0 (
        echo.
        echo   Rust is not installed. Choose [3] to auto-install.
        pause
        goto end
    )
    echo.
    echo   Starting Tauri Desktop App...
    echo.
    call pnpm tauri dev
    goto end
)

:: Option 4: Run Tests
if "%choice%"=="4" (
    echo.
    echo   Running tests...
    cd /d "%~dp0apps\desktop"
    call pnpm test
    goto end
)

if "%choice%"=="5" exit /b 0

:end
echo.
echo   Done.
pause
