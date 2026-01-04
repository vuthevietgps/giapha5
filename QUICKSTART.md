# Quick Start Guide - Gia Phả Version 7

## 🚀 Khởi động nhanh trong 3 bước

### Bước 1: Chuẩn bị MongoDB Atlas

1. Đăng nhập vào [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Tạo cluster (miễn phí) nếu chưa có
3. Lấy connection string:
   - Click "Connect" → "Connect your application"
   - Copy connection string, ví dụ:
     ```
     mongodb+srv://username:password@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
     ```
4. Whitelist IP:
   - Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)

### Bước 2: Cấu hình môi trường

1. Copy file template:
   ```bash
   cp .env.example .env
   ```

2. Mở file `.env` và thay đổi:
   ```env
   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/giapha?retryWrites=true&w=majority
   ```
   
   **Thay thế:**
   - `YOUR_USERNAME` → username MongoDB của bạn
   - `YOUR_PASSWORD` → password MongoDB của bạn  
   - `YOUR_CLUSTER` → tên cluster của bạn

### Bước 3: Khởi chạy ứng dụng

#### Windows PowerShell:
```powershell
# Load helper functions
. .\docker-management.ps1

# Quick start với check môi trường
Quick-Start
```

#### Linux/Mac:
```bash
# Make script executable (chỉ cần 1 lần)
chmod +x docker-management.sh

# Quick start
./docker-management.sh quick-start
```

#### Manual (không dùng script):
```bash
docker-compose up -d --build
```

---

## ✅ Kiểm tra

### 1. Kiểm tra containers đang chạy:
```bash
docker-compose ps
```

Bạn sẽ thấy:
```
NAME                          STATUS
giapha-version7-backend       Up (healthy)
giapha-version7-frontend      Up
```

### 2. Kiểm tra logs:
```bash
# Xem tất cả logs
docker-compose logs

# Chỉ xem backend logs
docker-compose logs backend

# Follow logs (real-time)
docker-compose logs -f
```

### 3. Truy cập ứng dụng:

- **Frontend (Web UI):** http://localhost
- **Backend API:** http://localhost:3000/api
- **Health check:** http://localhost:3000/api (sẽ trả về 404 nhưng nghĩa là server đang chạy)

---

## 🎯 Các bước tiếp theo

### 1. Tạo dòng họ đầu tiên
1. Mở http://localhost
2. Vào menu "Dòng họ"
3. Click "Thêm dòng họ"
4. Nhập tên dòng họ và lưu

### 2. Tạo thành viên đầu tiên
1. Vào menu "Thành viên"
2. Click "Thêm thành viên"
3. Điền thông tin và chọn dòng họ
4. Lưu

### 3. Xem cây gia phả
1. Vào menu "Cây gia phả"
2. Chọn dòng họ
3. Click "Tạo đời đầu" để tạo root member
4. Bắt đầu thêm vợ/chồng và con cái

---

## 🔧 Các lệnh hữu ích

### Dừng ứng dụng:
```bash
docker-compose down
```

### Khởi động lại:
```bash
docker-compose restart
```

### Rebuild sau khi thay đổi code:
```bash
docker-compose up -d --build
```

### Xem logs real-time:
```bash
docker-compose logs -f
```

### Backup uploads (ảnh đại diện, ảnh nền):

**PowerShell:**
```powershell
. .\docker-management.ps1
Backup-GiaPhaUploads -BackupPath "C:\backup\giapha"
```

**Bash:**
```bash
./docker-management.sh backup /path/to/backup
```

### Xóa tất cả và bắt đầu lại:
```bash
# Xóa containers (giữ uploads)
docker-compose down

# Xóa cả uploads
docker-compose down -v
```

---

## ❗ Common Issues

### 1. Port 80 đã được sử dụng

**Lỗi:** `Bind for 0.0.0.0:80 failed: port is already allocated`

**Giải pháp:** Thay đổi port trong `docker-compose.yml`:
```yaml
frontend:
  ports:
    - '8080:80'  # Thay vì 80:80
```
Sau đó truy cập: http://localhost:8080

### 2. Backend không kết nối được MongoDB

**Lỗi trong logs:** `MongoServerError: bad auth`

**Giải pháp:**
1. Kiểm tra username/password trong `.env`
2. Đảm bảo password không chứa ký tự đặc biệt (hoặc encode URL)
3. Kiểm tra IP whitelist trong MongoDB Atlas

### 3. Container không start

**Kiểm tra:**
```bash
# Xem logs chi tiết
docker-compose logs backend
docker-compose logs frontend

# Kiểm tra .env file
cat .env  # Linux/Mac
type .env  # Windows
```

### 4. Changes không có hiệu lực

**Giải pháp:** Rebuild images
```bash
docker-compose down
docker-compose up -d --build
```

---

## 📚 Tài liệu đầy đủ

- [README.md](./README.md) - Tổng quan project
- [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md) - Hướng dẫn deploy chi tiết
- [server/README.md](./server/README.md) - Backend documentation
- [web/README.md](./web/README.md) - Frontend documentation

---

## 🆘 Cần trợ giúp?

1. Kiểm tra logs: `docker-compose logs -f`
2. Xem status: `docker-compose ps`
3. Kiểm tra .env: Đảm bảo MONGODB_URI đúng format
4. Test kết nối MongoDB: Dùng MongoDB Compass với connection string
5. Tạo issue trong repository

---

**Chúc bạn sử dụng thành công! 🎉**
