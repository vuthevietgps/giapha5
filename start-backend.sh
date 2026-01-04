#!/bin/bash
# Script để khởi động Backend (NestJS)
# Bash script for Linux/Mac

echo "🚀 Đang khởi động Backend Server..."
echo "================================================"

# Di chuyển vào thư mục server
cd "$(dirname "$0")/server" || exit 1

# Kiểm tra xem node_modules có tồn tại không
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules không tồn tại. Đang cài đặt dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Lỗi khi cài đặt dependencies!"
        exit 1
    fi
fi

# Khởi động backend trong chế độ development
echo "🎯 Khởi động NestJS trong chế độ development..."
npm run start:dev
