# Docker Management Scripts for Windows PowerShell

# Build và start tất cả services
function Start-GiaPha {
    Write-Host "Starting Gia Pha Version 7..." -ForegroundColor Green
    docker-compose up -d --build
    Write-Host "Services started successfully!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost" -ForegroundColor Cyan
    Write-Host "Backend API: http://localhost:3000/api" -ForegroundColor Cyan
}

# Stop tất cả services
function Stop-GiaPha {
    Write-Host "Stopping Gia Pha Version 7..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "Services stopped successfully!" -ForegroundColor Green
}

# Restart tất cả services
function Restart-GiaPha {
    Write-Host "Restarting Gia Pha Version 7..." -ForegroundColor Yellow
    docker-compose restart
    Write-Host "Services restarted successfully!" -ForegroundColor Green
}

# Xem logs
function Show-GiaPhaLogs {
    param(
        [string]$Service = ""
    )
    if ($Service) {
        docker-compose logs -f $Service
    } else {
        docker-compose logs -f
    }
}

# Xem status
function Get-GiaPhaStatus {
    Write-Host "Gia Pha Version 7 Status:" -ForegroundColor Cyan
    docker-compose ps
}

# Rebuild một service cụ thể
function Rebuild-GiaPhaService {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("backend", "frontend")]
        [string]$Service
    )
    Write-Host "Rebuilding $Service..." -ForegroundColor Yellow
    docker-compose up -d --build $Service
    Write-Host "$Service rebuilt successfully!" -ForegroundColor Green
}

# Clean up (xóa containers và volumes)
function Remove-GiaPha {
    param(
        [switch]$IncludeVolumes
    )
    Write-Host "Removing Gia Pha Version 7..." -ForegroundColor Red
    $confirm = Read-Host "Are you sure? This will stop and remove all containers. (y/n)"
    if ($confirm -eq 'y') {
        if ($IncludeVolumes) {
            docker-compose down -v
            Write-Host "Containers and volumes removed!" -ForegroundColor Green
        } else {
            docker-compose down
            Write-Host "Containers removed! (volumes preserved)" -ForegroundColor Green
        }
    }
}

# Backup uploads
function Backup-GiaPhaUploads {
    param(
        [string]$BackupPath = "./uploads-backup"
    )
    Write-Host "Backing up uploads to $BackupPath..." -ForegroundColor Yellow
    docker cp giapha-version7-backend:/app/uploads $BackupPath
    Write-Host "Backup completed successfully!" -ForegroundColor Green
}

# Restore uploads
function Restore-GiaPhaUploads {
    param(
        [Parameter(Mandatory=$true)]
        [string]$BackupPath
    )
    Write-Host "Restoring uploads from $BackupPath..." -ForegroundColor Yellow
    docker cp "$BackupPath/." giapha-version7-backend:/app/uploads/
    Write-Host "Restore completed successfully!" -ForegroundColor Green
}

# Check environment
function Test-GiaPhaEnvironment {
    Write-Host "Checking environment..." -ForegroundColor Cyan
    
    if (!(Test-Path ".env")) {
        Write-Host "ERROR: .env file not found!" -ForegroundColor Red
        Write-Host "Please create .env file from .env.example" -ForegroundColor Yellow
        return $false
    }
    
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "mongodb\+srv://.*@.*\.mongodb\.net") {
        Write-Host "✓ MongoDB URI configured" -ForegroundColor Green
    } else {
        Write-Host "WARNING: MongoDB URI might not be configured correctly" -ForegroundColor Yellow
    }
    
    Write-Host "✓ Environment check completed" -ForegroundColor Green
    return $true
}

# Quick start với check environment
function Quick-Start {
    if (Test-GiaPhaEnvironment) {
        Start-GiaPha
    }
}

# Export functions
Export-ModuleMember -Function @(
    'Start-GiaPha',
    'Stop-GiaPha',
    'Restart-GiaPha',
    'Show-GiaPhaLogs',
    'Get-GiaPhaStatus',
    'Rebuild-GiaPhaService',
    'Remove-GiaPha',
    'Backup-GiaPhaUploads',
    'Restore-GiaPhaUploads',
    'Test-GiaPhaEnvironment',
    'Quick-Start'
)

# Show help
Write-Host @"

Gia Pha Version 7 - Docker Management Commands
===============================================

Quick Start:
  Quick-Start                          # Check environment and start

Basic Commands:
  Start-GiaPha                         # Build and start all services
  Stop-GiaPha                          # Stop all services
  Restart-GiaPha                       # Restart all services
  Get-GiaPhaStatus                     # Show status of all services

Logs:
  Show-GiaPhaLogs                      # Show all logs (follow mode)
  Show-GiaPhaLogs -Service backend     # Show backend logs only
  Show-GiaPhaLogs -Service frontend    # Show frontend logs only

Rebuild:
  Rebuild-GiaPhaService -Service backend    # Rebuild backend only
  Rebuild-GiaPhaService -Service frontend   # Rebuild frontend only

Backup & Restore:
  Backup-GiaPhaUploads                      # Backup uploads to ./uploads-backup
  Backup-GiaPhaUploads -BackupPath "C:\backup"  # Backup to custom path
  Restore-GiaPhaUploads -BackupPath "C:\backup" # Restore from backup

Cleanup:
  Remove-GiaPha                        # Remove containers (keep volumes)
  Remove-GiaPha -IncludeVolumes        # Remove containers and volumes

Environment:
  Test-GiaPhaEnvironment               # Check .env configuration

"@ -ForegroundColor Cyan
