# Script để khởi động Frontend (Angular)
# PowerShell script for Windows

Write-Host "🌐 Đang khởi động Frontend (Angular)..." -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Cyan

# Di chuyển vào thư mục web
Set-Location -Path "$PSScriptRoot\web"

# Kiểm tra xem node_modules có tồn tại không
if (!(Test-Path "node_modules")) {
    Write-Host "📦 node_modules không tồn tại. Đang cài đặt dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Lỗi khi cài đặt dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Khởi động frontend
Write-Host "🎯 Khởi động Angular Development Server..." -ForegroundColor Blue
npm start
