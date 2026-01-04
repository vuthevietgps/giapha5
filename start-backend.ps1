# Script để khởi động Backend (NestJS)
# PowerShell script for Windows

Write-Host "🚀 Đang khởi động Backend Server..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

# Di chuyển vào thư mục server
Set-Location -Path "$PSScriptRoot\server"

# Kiểm tra xem node_modules có tồn tại không
if (!(Test-Path "node_modules")) {
    Write-Host "📦 node_modules không tồn tại. Đang cài đặt dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Lỗi khi cài đặt dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Khởi động backend trong chế độ development
Write-Host "🎯 Khởi động NestJS trong chế độ development..." -ForegroundColor Green
npm run start:dev
