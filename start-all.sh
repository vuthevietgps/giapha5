#!/bin/bash
# Script để khởi động cả Backend và Frontend
# Bash script for Linux/Mac

echo "🎯 Đang khởi động Backend và Frontend..."
echo "================================================"

# Lấy đường dẫn thư mục hiện tại
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Hàm để dọn dẹp khi script kết thúc
cleanup() {
    echo ""
    echo "🛑 Đang dừng các service..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Bắt tín hiệu CTRL+C
trap cleanup SIGINT SIGTERM

# Khởi động Backend
echo "🚀 Khởi động Backend..."
cd "$SCRIPT_DIR/server" || exit 1

if [ ! -d "node_modules" ]; then
    echo "📦 Cài đặt dependencies cho Backend..."
    npm install
fi

npm run start:dev &
BACKEND_PID=$!

# Đợi 3 giây để backend khởi động
sleep 3

# Khởi động Frontend
echo "🌐 Khởi động Frontend..."
cd "$SCRIPT_DIR/web" || exit 1

if [ ! -d "node_modules" ]; then
    echo "📦 Cài đặt dependencies cho Frontend..."
    npm install
fi

npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Đã khởi động cả Backend và Frontend!"
echo ""
echo "📍 Backend sẽ chạy tại: http://localhost:3000"
echo "📍 Frontend sẽ chạy tại: http://localhost:4200"
echo ""
echo "💡 Nhấn CTRL+C để dừng tất cả các service."

# Đợi cho đến khi nhận tín hiệu dừng
wait
