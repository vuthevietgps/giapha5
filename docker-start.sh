#!/bin/bash
# Script khởi động Docker cho Linux/Mac
# Chạy: ./docker-start.sh

echo "=================================="
echo "  Gia Phả App - Docker Startup"
echo "=================================="
echo ""

# Kiểm tra Docker đã cài chưa
if ! command -v docker &> /dev/null; then
    echo "✗ Docker chưa được cài đặt!"
    echo "Vui lòng cài Docker từ: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✓ Docker đã được cài đặt: $(docker --version)"

# Kiểm tra Docker đang chạy
if ! docker ps &> /dev/null; then
    echo "✗ Docker daemon không chạy!"
    echo "Vui lòng khởi động Docker"
    exit 1
fi

echo "✓ Docker daemon đang chạy"
echo ""

echo "Chọn chế độ khởi động:"
echo "1. Khởi động bình thường (xem logs trực tiếp)"
echo "2. Chạy ở background (detached mode)"
echo "3. Rebuild và khởi động"
echo "4. Reset hoàn toàn (xóa database và rebuild)"
echo "5. Chỉ khởi động database (MongoDB)"
echo "6. Dừng tất cả containers"
echo "7. Xem logs"
echo "0. Thoát"
echo ""

read -p "Nhập lựa chọn (0-7): " choice

case $choice in
    1)
        echo ""
        echo "Đang khởi động containers..."
        docker-compose up
        ;;
    2)
        echo ""
        echo "Đang khởi động containers ở background..."
        docker-compose up -d
        echo ""
        echo "✓ Containers đã được khởi động!"
        echo ""
        echo "Truy cập ứng dụng tại:"
        echo "  - Website: http://localhost:8080"
        echo "  - MongoDB Express: http://localhost:8081"
        echo "  - API: http://localhost:8080/api"
        echo ""
        echo "Xem logs: docker-compose logs -f"
        echo "Dừng: docker-compose down"
        ;;
    3)
        echo ""
        echo "Đang rebuild và khởi động..."
        docker-compose up -d --build
        echo ""
        echo "✓ Rebuild hoàn tất!"
        echo ""
        echo "Truy cập ứng dụng tại:"
        echo "  - Website: http://localhost:8080"
        echo "  - MongoDB Express: http://localhost:8081"
        ;;
    4)
        echo ""
        echo "Cảnh báo: Thao tác này sẽ xóa toàn bộ dữ liệu database!"
        read -p "Bạn có chắc chắn? (y/N): " confirm
        if [[ $confirm == [yY] ]]; then
            echo ""
            echo "Đang dừng và xóa containers..."
            docker-compose down -v
            echo "Đang xóa images cũ..."
            docker rmi giapha-server:local -f 2>/dev/null
            docker rmi giapha-web:local -f 2>/dev/null
            echo "Đang rebuild từ đầu..."
            docker-compose up -d --build
            echo ""
            echo "✓ Reset hoàn tất!"
        else
            echo "Đã hủy thao tác"
        fi
        ;;
    5)
        echo ""
        echo "Đang khởi động MongoDB..."
        docker-compose up -d mongo mongo-express
        echo ""
        echo "✓ MongoDB đã được khởi động!"
        echo ""
        echo "MongoDB Express: http://localhost:8081"
        echo "MongoDB URI: mongodb://root:example@localhost:27017"
        ;;
    6)
        echo ""
        echo "Đang dừng containers..."
        docker-compose down
        echo ""
        echo "✓ Đã dừng tất cả containers"
        ;;
    7)
        echo ""
        echo "Xem logs (Ctrl+C để thoát)..."
        echo ""
        docker-compose logs -f
        ;;
    0)
        echo ""
        echo "Tạm biệt!"
        exit 0
        ;;
    *)
        echo ""
        echo "Lựa chọn không hợp lệ!"
        ;;
esac
