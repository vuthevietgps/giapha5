# Script khởi động Docker cho Windows
# Chạy: .\docker-start.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Gia Phả App - Docker Startup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Docker đã cài chưa
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker đã được cài đặt: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker chưa được cài đặt!" -ForegroundColor Red
    Write-Host "Vui lòng tải và cài Docker Desktop từ: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Kiểm tra Docker đang chạy
try {
    docker ps | Out-Null
    Write-Host "✓ Docker daemon đang chạy" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker daemon không chạy!" -ForegroundColor Red
    Write-Host "Vui lòng khởi động Docker Desktop" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Chọn chế độ khởi động:" -ForegroundColor Yellow
Write-Host "1. Khởi động bình thường (xem logs trực tiếp)" -ForegroundColor White
Write-Host "2. Chạy ở background (detached mode)" -ForegroundColor White
Write-Host "3. Rebuild và khởi động" -ForegroundColor White
Write-Host "4. Reset hoàn toàn (xóa database và rebuild)" -ForegroundColor White
Write-Host "5. Chỉ khởi động database (MongoDB)" -ForegroundColor White
Write-Host "6. Dừng tất cả containers" -ForegroundColor White
Write-Host "7. Xem logs" -ForegroundColor White
Write-Host "0. Thoát" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Nhập lựa chọn (0-7)"

switch ($choice) {
    "1" {
        Write-Host "`nĐang khởi động containers..." -ForegroundColor Cyan
        docker-compose up
    }
    "2" {
        Write-Host "`nĐang khởi động containers ở background..." -ForegroundColor Cyan
        docker-compose up -d
        Write-Host ""
        Write-Host "✓ Containers đã được khởi động!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Truy cập ứng dụng tại:" -ForegroundColor Yellow
        Write-Host "  - Website: http://localhost:8080" -ForegroundColor White
        Write-Host "  - MongoDB Express: http://localhost:8081" -ForegroundColor White
        Write-Host "  - API: http://localhost:8080/api" -ForegroundColor White
        Write-Host ""
        Write-Host "Xem logs: docker-compose logs -f" -ForegroundColor Gray
        Write-Host "Dừng: docker-compose down" -ForegroundColor Gray
    }
    "3" {
        Write-Host "`nĐang rebuild và khởi động..." -ForegroundColor Cyan
        docker-compose up -d --build
        Write-Host ""
        Write-Host "✓ Rebuild hoàn tất!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Truy cập ứng dụng tại:" -ForegroundColor Yellow
        Write-Host "  - Website: http://localhost:8080" -ForegroundColor White
        Write-Host "  - MongoDB Express: http://localhost:8081" -ForegroundColor White
    }
    "4" {
        Write-Host "`nCảnh báo: Thao tác này sẽ xóa toàn bộ dữ liệu database!" -ForegroundColor Red
        $confirm = Read-Host "Bạn có chắc chắn? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Write-Host "`nĐang dừng và xóa containers..." -ForegroundColor Cyan
            docker-compose down -v
            Write-Host "Đang xóa images cũ..." -ForegroundColor Cyan
            docker rmi giapha-server:local -f 2>$null
            docker rmi giapha-web:local -f 2>$null
            Write-Host "Đang rebuild từ đầu..." -ForegroundColor Cyan
            docker-compose up -d --build
            Write-Host ""
            Write-Host "✓ Reset hoàn tất!" -ForegroundColor Green
        } else {
            Write-Host "Đã hủy thao tác" -ForegroundColor Yellow
        }
    }
    "5" {
        Write-Host "`nĐang khởi động MongoDB..." -ForegroundColor Cyan
        docker-compose up -d mongo mongo-express
        Write-Host ""
        Write-Host "✓ MongoDB đã được khởi động!" -ForegroundColor Green
        Write-Host ""
        Write-Host "MongoDB Express: http://localhost:8081" -ForegroundColor White
        Write-Host "MongoDB URI: mongodb://root:example@localhost:27017" -ForegroundColor White
    }
    "6" {
        Write-Host "`nĐang dừng containers..." -ForegroundColor Cyan
        docker-compose down
        Write-Host ""
        Write-Host "✓ Đã dừng tất cả containers" -ForegroundColor Green
    }
    "7" {
        Write-Host "`nXem logs (Ctrl+C để thoát)..." -ForegroundColor Cyan
        Write-Host ""
        docker-compose logs -f
    }
    "0" {
        Write-Host "`nTạm biệt!" -ForegroundColor Cyan
        exit 0
    }
    default {
        Write-Host "`nLựa chọn không hợp lệ!" -ForegroundColor Red
    }
}
