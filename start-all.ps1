# Script để khởi động cả Backend và Frontend
# PowerShell script for Windows

Write-Host "🎯 Đang khởi động Backend và Frontend..." -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

# Lấy đường dẫn thư mục hiện tại
$rootDir = $PSScriptRoot

# Khởi động Backend trong terminal mới
Write-Host "🚀 Khởi động Backend..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "& '$rootDir\start-backend.ps1'"

# Đợi 3 giây để backend khởi động trước
Start-Sleep -Seconds 3

# Khởi động Frontend trong terminal mới
Write-Host "🌐 Khởi động Frontend..." -ForegroundColor Blue
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "& '$rootDir\start-frontend.ps1'"

Write-Host ""
Write-Host "✅ Đã khởi động cả Backend và Frontend trong các terminal riêng biệt!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend sẽ chạy tại: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📍 Frontend sẽ chạy tại: http://localhost:4200" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Đóng các cửa sổ terminal để dừng các service." -ForegroundColor Yellow
