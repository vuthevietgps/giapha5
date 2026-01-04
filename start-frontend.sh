#!/bin/bash
# Script để khởi động Frontend (Angular)
# Bash script for Linux/Mac

echo "🌐 Đang khởi động Frontend (Angular)..."
echo "================================================"

# Di chuyển vào thư mục web
cd "$(dirname "$0")/web" || exit 1

# Kiểm tra xem node_modules có tồn tại không
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules không tồn tại. Đang cài đặt dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Lỗi khi cài đặt dependencies!"
        exit 1
    fi
fi

# Khởi động frontend
echo "🎯 Khởi động Angular Development Server..."
npm start
