param(
  [switch]$Yes,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRootFull = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
$AppIdentifier = 'com.neotavern.demo'
$ProductName = 'NeoTavern Demo'

function Write-Info($Message) {
  Write-Host "[Neo cleanup] $Message"
}

function Get-FullPathOrNull($Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
  try {
    return [System.IO.Path]::GetFullPath($Path)
  } catch {
    return $null
  }
}

function Test-IsInside($Path, $Root) {
  $full = Get-FullPathOrNull $Path
  $rootFull = (Get-FullPathOrNull $Root).TrimEnd('\')
  if (-not $full -or -not $rootFull) { return $false }
  return $full.TrimEnd('\').StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)
}

function Add-Target {
  param(
    [System.Collections.Generic.List[object]]$Targets,
    [string]$Path,
    [string]$Kind,
    [string]$Reason
  )

  $full = Get-FullPathOrNull $Path
  if (-not $full) { return }

  if (Test-Path -LiteralPath $full) {
    $Targets.Add([pscustomobject]@{
      Path = $full
      Kind = $Kind
      Reason = $Reason
    })
  }
}

function Assert-SafeTarget($Target) {
  $path = $Target.Path
  if ($Target.Kind -eq 'project') {
    if (-not (Test-IsInside $path $ProjectRootFull)) {
      throw "Refusing to delete project target outside workspace: $path"
    }
    return
  }

  if ($Target.Kind -eq 'app-data') {
    $roots = @($env:APPDATA, $env:LOCALAPPDATA) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    $insideKnownRoot = $false
    foreach ($root in $roots) {
      if (Test-IsInside $path $root) {
        $insideKnownRoot = $true
        break
      }
    }
    if (-not $insideKnownRoot) {
      throw "Refusing to delete app-data target outside APPDATA/LOCALAPPDATA: $path"
    }
    return
  }

  throw "Unknown target kind: $($Target.Kind)"
}

function Stop-ProjectProcesses {
  Write-Info "Checking for running project dev processes..."
  $processes = Get-CimInstance Win32_Process |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match [regex]::Escape($ProjectRootFull) -and
      $_.Name -in @('node.exe', 'pnpm.exe', 'cmd.exe', 'powershell.exe', 'cargo.exe', 'rustc.exe')
    }

  foreach ($process in $processes) {
    if ($process.ProcessId -eq $PID) { continue }
    if ($DryRun) {
      Write-Info "Would stop $($process.Name) pid=$($process.ProcessId)"
    } else {
      Write-Info "Stopping $($process.Name) pid=$($process.ProcessId)"
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }
}

function Get-GeneratedFiles($Root) {
  $skipDirs = @('node_modules', '.git', 'target', 'dist')
  $queue = [System.Collections.Generic.Queue[string]]::new()
  $queue.Enqueue($Root)

  while ($queue.Count -gt 0) {
    $dir = $queue.Dequeue()

    Get-ChildItem -LiteralPath $dir -Force -File -Filter '*.tsbuildinfo' -ErrorAction SilentlyContinue
    Get-ChildItem -LiteralPath $dir -Force -File -Filter '*.log' -ErrorAction SilentlyContinue

    Get-ChildItem -LiteralPath $dir -Force -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notin $skipDirs } |
      ForEach-Object { $queue.Enqueue($_.FullName) }
  }
}

function Remove-Target($Target) {
  Assert-SafeTarget $Target
  Write-Info "Delete: $($Target.Path)"
  Write-Host "  $($Target.Reason)"

  if ($DryRun) { return }
  Remove-Item -LiteralPath $Target.Path -Recurse -Force -ErrorAction SilentlyContinue
}

$targets = [System.Collections.Generic.List[object]]::new()

Add-Target $targets (Join-Path $ProjectRootFull 'node_modules') 'project' 'Root npm/pnpm dependencies'
Add-Target $targets (Join-Path $ProjectRootFull 'dist') 'project' 'Root build output'
Add-Target $targets (Join-Path $ProjectRootFull 'target') 'project' 'Root Rust build output'
Add-Target $targets (Join-Path $ProjectRootFull 'apps\desktop\node_modules') 'project' 'Desktop app dependencies'
Add-Target $targets (Join-Path $ProjectRootFull 'apps\desktop\dist') 'project' 'Desktop app build output'
Add-Target $targets (Join-Path $ProjectRootFull 'apps\desktop\.vite') 'project' 'Vite cache'
Add-Target $targets (Join-Path $ProjectRootFull 'apps\desktop\src-tauri\target') 'project' 'Tauri/Rust build output'

Get-GeneratedFiles $ProjectRootFull |
  ForEach-Object {
    Add-Target $targets $_.FullName 'project' 'Generated cache/log file'
  }

Get-ChildItem -LiteralPath (Join-Path $ProjectRootFull 'packages') -Directory -ErrorAction SilentlyContinue |
  ForEach-Object {
    Add-Target $targets (Join-Path $_.FullName 'dist') 'project' 'Package build output'
  }

$appDataCandidates = @()
if ($env:APPDATA) {
  $appDataCandidates += Join-Path $env:APPDATA $AppIdentifier
  $appDataCandidates += Join-Path $env:APPDATA $ProductName
}
if ($env:LOCALAPPDATA) {
  $appDataCandidates += Join-Path $env:LOCALAPPDATA $AppIdentifier
  $appDataCandidates += Join-Path $env:LOCALAPPDATA $ProductName
}

foreach ($path in $appDataCandidates | Select-Object -Unique) {
  Add-Target $targets $path 'app-data' 'Tauri app data, including store.json with chats, messages, presets, characters, world books, settings'
}

Write-Host ''
Write-Host 'NeoTavern project cleanup'
Write-Host 'This removes local app data and generated environment files.'
Write-Host 'It does not remove source files or Git history.'
Write-Host ''

if ($targets.Count -eq 0) {
  Write-Info 'Nothing to delete.'
  exit 0
}

Write-Host 'Targets:'
foreach ($target in $targets) {
  Write-Host " - $($target.Path)"
  Write-Host "   $($target.Reason)"
}
Write-Host ''

if (-not $Yes -and -not $DryRun) {
  Write-Host 'This will permanently delete local chats, messages, presets, characters, world books, settings, and generated environment files.'
  $confirm = Read-Host 'Type DELETE to continue'
  if ($confirm -ne 'DELETE') {
    Write-Info 'Cancelled. Nothing was deleted.'
    exit 0
  }
}

Stop-ProjectProcesses

foreach ($target in $targets) {
  Remove-Target $target
}

Write-Host ''
if ($DryRun) {
  Write-Info 'Dry run complete. Nothing was deleted.'
} else {
  Write-Info 'Cleanup complete.'
}

Write-Host ''
Write-Host 'Note: browser dev-mode localStorage can only be cleared from that browser origin.'
Write-Host 'If you used the old browser-only version, open uninstall.html and click confirm there too.'
