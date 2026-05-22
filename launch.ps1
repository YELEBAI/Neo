# NeoTavern Demo Launcher
# 自动检查环境、安装缺失依赖、启动项目

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

function Write-Step { param($Text) Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-OK { param($Text) Write-Host "  OK  $Text" -ForegroundColor Green }
function Write-Warn { param($Text) Write-Host "  WARN $Text" -ForegroundColor Yellow }
function Write-Err { param($Text) Write-Host "  ERR  $Text" -ForegroundColor Red }
function Write-Hint { param($Text) Write-Host "       $Text" -ForegroundColor DarkGray }

function Test-Command { param($Name) return (Get-Command $Name -ErrorAction SilentlyContinue) -ne $null }

# ============================================================
# Step 1: Check / Install Node.js
# ============================================================
Write-Step "Step 1/6: Checking Node.js"

$nodeInstalled = $false
if (Test-Command "node") {
  $nodeVer = (node -v) -replace 'v', ''
  $major = [int]($nodeVer.Split('.')[0])
  if ($major -ge 18) {
    Write-OK "Node.js v$nodeVer  (>=18 required)"
    $nodeInstalled = $true
  } else {
    Write-Warn "Node.js v$nodeVer found, but >=18 required. Will reinstall."
  }
} else {
  Write-Warn "Node.js not found."
}

if (-not $nodeInstalled) {
  Write-Host "`n  Downloading Node.js LTS..."
  $nodeUrl = "https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi"
  $nodeInstaller = "$env:TEMP\nodejs-installer.msi"

  try {
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
    Write-Host "  Installing Node.js (this may take a minute)..."
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait -NoNewWindow
    Remove-Item $nodeInstaller -Force

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-OK "Node.js installed. Version: $(node -v)"
  } catch {
    Write-Err "Failed to install Node.js. Please install manually: https://nodejs.org"
    Write-Hint "Download the LTS .msi installer, run it, then re-launch this script."
    pause
    exit 1
  }
}

# ============================================================
# Step 2: Check / Install pnpm
# ============================================================
Write-Step "Step 2/6: Checking pnpm"

if (Test-Command "pnpm") {
  Write-OK "pnpm $(pnpm -v)"
} else {
  Write-Host "`n  Installing pnpm via npm..."
  npm install -g pnpm
  if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to install pnpm. Trying with corepack..."
    corepack enable
    corepack prepare pnpm@latest --activate
  }
  Write-OK "pnpm $(pnpm -v)"
}

# ============================================================
# Step 3: Check / Install Rust (optional, for Tauri)
# ============================================================
Write-Step "Step 3/6: Checking Rust"

$hasRust = $false
if (Test-Command "rustc") {
  Write-OK "Rust $(rustc -V)"
  $hasRust = $true
} else {
  Write-Warn "Rust not found  (only needed for Tauri desktop mode)"
  Write-Host "  Without Rust you can still run the web dev server (pnpm dev)."
  Write-Host "  Install Rust later via: https://rustup.rs"
  Write-Host ""
}

# ============================================================
# Step 4: Install project dependencies
# ============================================================
Write-Step "Step 4/6: Installing project dependencies"

Push-Location $ProjectRoot

if (Test-Path "node_modules") {
  Write-Hint "node_modules already exists, running pnpm install to verify..."
}

pnpm install
if ($LASTEXITCODE -ne 0) {
  Write-Err "pnpm install failed. Check errors above."
  Pop-Location
  pause
  exit 1
}
Write-OK "Dependencies installed."

# ============================================================
# Step 5: Generate database migrations
# ============================================================
Write-Step "Step 5/6: Setting up database"

Push-Location "$ProjectRoot\apps\desktop"

if (-not (Test-Path "drizzle")) {
  Write-Host "  Generating Drizzle migrations..."
  npx drizzle-kit generate
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "drizzle-kit generate had issues (may be ok for first run)"
  } else {
    Write-OK "Database migrations generated."
  }
} else {
  Write-OK "Migrations already exist."

}

Pop-Location

# ============================================================
# Step 6: Start the project
# ============================================================
Write-Step "Step 6/6: Launch NeoTavern Demo"

Write-Host ""
Write-Host "  [1] Web Dev Server (browser, no Rust needed)" -ForegroundColor White
Write-Host "  [2] Tauri Desktop   (native window, needs Rust)" -ForegroundColor White
if (-not $hasRust) { Write-Host "       ^ Rust not installed, option 2 will fail" -ForegroundColor DarkGray }
Write-Host "  [3] Run Tests" -ForegroundColor White
Write-Host "  [q] Quit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Choose [1/2/3/q]"

switch ($choice) {
  "1" {
    Write-OK "Starting web dev server..."
    Write-Hint "Open http://localhost:1420 in your browser"
    pnpm dev
  }
  "2" {
    if (-not $hasRust) {
      Write-Err "Rust is required for Tauri. Install from https://rustup.rs first."
      pause
      exit 1
    }
    Write-OK "Starting Tauri desktop app..."
    pnpm tauri dev
  }
  "3" {
    Write-OK "Running tests..."
    Push-Location "$ProjectRoot\apps\desktop"
    pnpm test
    Pop-Location
  }
  "q" {
    Write-Host "Bye!" -ForegroundColor Green
  }
  default {
    Write-Warn "Unknown option, exiting."
  }
}

Pop-Location

Write-Host ""
Write-Host "Launch complete." -ForegroundColor Green
