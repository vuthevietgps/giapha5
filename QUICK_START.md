# 🚀 Chạy nhanh với Docker

## Cách 1: Sử dụng script tự động (Khuyến nghị)

### Windows
```powershell
.\docker-start.ps1
```

### Linux/Mac
```bash
chmod +x docker-start.sh
./docker-start.sh
```

Script sẽ hiển thị menu với các tùy chọn:
- Khởi động bình thường
- Chạy background
- Rebuild
- Reset database
- Chỉ chạy MongoDB
- Dừng containers
- Xem logs

## Cách 2: Chạy thủ công

```bash
# Build và khởi động tất cả
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Dừng
docker-compose down
```

## Truy cập ứng dụng

Sau khi khởi động thành công:

- **Website**: http://localhost:8080
- **MongoDB Express**: http://localhost:8081 (user: `admin`, pass: `pass`)
- **API**: http://localhost:8080/api

## Tài khoản test

**Super Admin**
- Email: `superadmin@giapha.system`
- Password: `SuperAdmin@123`

**Admin**
- Email: `admin1@giapha.test` (hoặc admin2, admin3)
- Password: `Admin@123`

## Xem hướng dẫn chi tiết

Đọc file `DOCKER_SETUP.md` để biết thêm thông tin về:
- Cài đặt Docker Desktop
- Troubleshooting
- Cấu hình nâng cao
- Backup/Restore
- Performance tips

## Lệnh hữu ích

```bash
# Xem trạng thái containers
docker-compose ps

# Xem logs của service cụ thể
docker-compose logs -f server
docker-compose logs -f web

# Restart một service
docker-compose restart server

# Stop và xóa tất cả (giữ data)
docker-compose down

# Stop và xóa kể cả data
docker-compose down -v

# Rebuild một service cụ thể
docker-compose up -d --build server
```

## Troubleshooting nhanh

**Port đã được sử dụng?**
```powershell
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8080
kill -9 <PID>
```

**Docker không khởi động?**
- Khởi động lại Docker Desktop
- Kiểm tra RAM/Disk space còn đủ không

**Rebuild từ đầu?**
```bash
docker-compose down -v
docker rmi giapha-server:local giapha-web:local -f
docker-compose up -d --build
```
