# Build and upload Android APK to the server
# Usage example:
#   pwsh -File scripts/build-and-upload-apk.ps1 -ServerHost 203.0.113.10 -Username admin-001 \
#        -BuildType debug -Port 22 -RemotePath "/opt/websites/sites/passport24h-shop/downloads/giapha-android.apk"
param(
  [Parameter(Mandatory = $true)]
  [string]$ServerHost,

  [string]$Username = $env:USERNAME,

  [int]$Port = 22,

  [ValidateSet('debug','release')]
  [string]$BuildType = 'debug',

  [string]$RemotePath = "/opt/websites/sites/passport24h-shop/downloads/giapha-android.apk",

  [string]$JdkPath
)

$ErrorActionPreference = 'Stop'

function Ensure-Java {
  param([string]$PreferredJdk)
  if ($PreferredJdk -and (Test-Path $PreferredJdk)) {
    $env:JAVA_HOME = $PreferredJdk
    $env:PATH = Join-Path $env:JAVA_HOME 'bin' + ";$env:PATH"
  } elseif (Test-Path "$Env:ProgramFiles\Android\Android Studio\jbr") {
    $env:JAVA_HOME = "$Env:ProgramFiles\Android\Android Studio\jbr"
    $env:PATH = Join-Path $env:JAVA_HOME 'bin' + ";$env:PATH"
  } elseif (Test-Path "C:\\Program Files\\Eclipse Adoptium\\jdk-17") {
    $env:JAVA_HOME = "C:\\Program Files\\Eclipse Adoptium\\jdk-17"
    $env:PATH = Join-Path $env:JAVA_HOME 'bin' + ";$env:PATH"
  } elseif (Test-Path "C:\\Program Files\\Java\\jdk-17") {
    $env:JAVA_HOME = "C:\\Program Files\\Java\\jdk-17"
    $env:PATH = Join-Path $env:JAVA_HOME 'bin' + ";$env:PATH"
  }
  if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw "Java not found. Install JDK 17 or pass -JdkPath 'C:\\path\\to\\jdk-17'"
  }
  Write-Host "Using JAVA_HOME=$env:JAVA_HOME" -ForegroundColor Cyan
  java -version
}

function Ensure-Scp {
  if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    throw "scp not found. Install OpenSSH Client (Windows Features) or use WinSCP to upload manually."
  }
}

Ensure-Java -PreferredJdk $JdkPath
Ensure-Scp

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$webPath  = Join-Path $repoRoot 'web'
if (-not (Test-Path $webPath)) { throw "Cannot find web folder at $webPath" }

Push-Location $webPath
try {
  Write-Host "Building Angular (mobile config)..." -ForegroundColor Cyan
  npm run build:mobile

  Write-Host "Syncing web assets to Android project..." -ForegroundColor Cyan
  npm run apk:sync

  $task = if ($BuildType -eq 'release') { 'assembleRelease' } else { 'assembleDebug' }
  Write-Host "Running Gradle task: $task" -ForegroundColor Cyan
  Push-Location 'android'
  try {
    & ./gradlew.bat $task
  } finally {
    Pop-Location
  }

  $apkDir = if ($BuildType -eq 'release') { 'android/app/build/outputs/apk/release' } else { 'android/app/build/outputs/apk/debug' }
  $apk = Get-ChildItem -Path $apkDir -Filter *.apk -ErrorAction Stop | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $apk) { throw "APK not found in $apkDir" }
  Write-Host "APK built: $($apk.FullName)" -ForegroundColor Green

  $dest = "$Username@$ServerHost:$RemotePath"
  Write-Host "Uploading to $dest ..." -ForegroundColor Cyan
  scp -P $Port -q -- "$($apk.FullName)" "$dest"
  Write-Host "Upload completed." -ForegroundColor Green

  Write-Host "Done. Test download at: https://passport24h.shop/downloads/giapha-android.apk" -ForegroundColor Yellow
}
finally {
  Pop-Location
}
