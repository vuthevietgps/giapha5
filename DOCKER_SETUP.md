# Hướng dẫn chạy ứng dụng bằng Docker trên Desktop

## Yêu cầu hệ thống

- **Docker Desktop** cho Windows/Mac/Linux
- **Docker Compose** (thường đi kèm Docker Desktop)
- RAM tối thiểu: 4GB
- Dung lượng trống: 5GB

## Cài đặt Docker Desktop

### Windows
1. Tải Docker Desktop từ: https://www.docker.com/products/docker-desktop/
2. Chạy file cài đặt và khởi động lại máy nếu cần
3. Mở Docker Desktop và đợi nó khởi động hoàn toàn

### Mac
```bash
brew install --cask docker
```
Hoặc tải từ website Docker

### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl start docker
sudo systemctl enable docker

# Thêm user vào group docker
sudo usermod -aG docker $USER
newgrp docker
```

## Cấu trúc Docker

Dự án có 3 services chính:

1. **mongo** - MongoDB database (port 27017)
2. **mongo-express** - Web UI quản lý MongoDB (port 8081)
3. **server** - NestJS API backend (port 3000 internal)
4. **web** - Angular frontend + Nginx (port 8080)

## Cách sử dụng

### 1. Build và khởi động toàn bộ hệ thống

```powershell
# Windows PowerShell
docker-compose up --build
```

```bash
# Linux/Mac
docker-compose up --build
```

### 2. Chạy ở chế độ background (detached)

```powershell
docker-compose up -d --build
```

### 3. Xem logs

```powershell
# Xem tất cả logs
docker-compose logs -f

# Xem log của service cụ thể
docker-compose logs -f server
docker-compose logs -f web
docker-compose logs -f mongo
```

### 4. Dừng các containers

```powershell
# Dừng nhưng giữ lại containers
docker-compose stop

# Dừng và xóa containers (giữ lại volumes/data)
docker-compose down

# Dừng và xóa tất cả kể cả volumes (reset database)
docker-compose down -v
```

### 5. Khởi động lại một service cụ thể

```powershell
# Rebuild và restart server
docker-compose up -d --build server

# Rebuild và restart web
docker-compose up -d --build web
```

## Truy cập ứng dụng

Sau khi các container đã chạy thành công:

- **Website**: http://localhost:8080
- **API Backend**: http://localhost:8080/api (proxy qua nginx)
- **MongoDB Express**: http://localhost:8081
  - Username: `admin`
  - Password: `pass`
- **MongoDB Direct**: mongodb://root:example@localhost:27017

## Test ứng dụng

### Test cơ bản

1. Mở trình duyệt và truy cập http://localhost:8080
2. Đăng nhập với tài khoản super admin:
   - Email: `superadmin@giapha.system`
   - Password: `SuperAdmin@123`
3. Test các chức năng:
   - Quản lý dòng họ
   - Thêm/sửa thành viên
   - Upload ảnh
   - Xem cây gia phả
   - Tạo bài viết

### Test API trực tiếp

```powershell
# Test health check
curl http://localhost:8080/api

# Test login
curl -X POST http://localhost:8080/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"superadmin@giapha.system","password":"SuperAdmin@123"}'
```

### Kiểm tra database

1. Truy cập http://localhost:8081
2. Username: `admin`, Password: `pass`
3. Chọn database `giapha`
4. Xem các collections: users, families, members, posts, etc.

## Troubleshooting

### Lỗi: Port already in use

```powershell
# Kiểm tra process đang dùng port
netstat -ano | findstr :8080
netstat -ano | findstr :27017

# Kill process (thay <PID> bằng Process ID)
taskkill /PID <PID> /F
```

### Lỗi: Cannot connect to Docker daemon

```powershell
# Khởi động Docker Desktop
# Hoặc restart Docker service
net stop com.docker.service
net start com.docker.service
```

### Lỗi: Out of disk space

```powershell
# Xóa các images và containers không dùng
docker system prune -a

# Xóa volumes không dùng
docker volume prune
```

### Rebuild từ đầu

```powershell
# Dừng và xóa tất cả
docker-compose down -v

# Xóa images cũ
docker rmi giapha-server:local
docker rmi giapha-web:local

# Build lại
docker-compose up --build
```

### Lỗi MongoDB connection

Nếu server không kết nối được MongoDB:

```powershell
# Kiểm tra MongoDB đã chạy chưa
docker-compose ps

# Restart MongoDB
docker-compose restart mongo

# Xem logs
docker-compose logs mongo
```

## Cấu hình nâng cao

### Thay đổi port

Chỉnh sửa `docker-compose.yml`:

```yaml
services:
  web:
    ports:
      - "3000:80"  # Thay 8080 thành port bạn muốn
```

### Sử dụng MongoDB Atlas thay vì local

Chỉnh sửa `docker-compose.yml`:

```yaml
services:
  server:
    environment:
      MONGODB_URI: mongodb+srv://username:password@cluster.mongodb.net/giapha?retryWrites=true&w=majority
```

### Chỉ chạy database

```powershell
docker-compose up -d mongo mongo-express
```

Sau đó chạy server và web ở local:

```powershell
# Terminal 1 - Server
cd server
npm install
npm run start:dev

# Terminal 2 - Web
cd web
npm install
npm start
```

## Production Deployment

Để deploy lên server production, xem thêm:

- `docker-compose.prod.yml` - Cấu hình production
- `docker-compose.deploy.yml` - Cấu hình deploy
- `DEPLOY_NOTES.md` - Hướng dẫn deploy chi tiết

## Backup và Restore

### Backup MongoDB

```powershell
# Backup toàn bộ database
docker exec -it giapha5-mongo-1 mongodump --uri="mongodb://root:example@localhost:27017/giapha?authSource=admin" --out=/tmp/backup

# Copy backup ra host
docker cp giapha5-mongo-1:/tmp/backup ./backup
```

### Restore MongoDB

```powershell
# Copy backup vào container
docker cp ./backup giapha5-mongo-1:/tmp/backup

# Restore
docker exec -it giapha5-mongo-1 mongorestore --uri="mongodb://root:example@localhost:27017/giapha?authSource=admin" /tmp/backup/giapha
```

## Performance Tips

1. **Tăng RAM cho Docker Desktop**: Settings → Resources → Memory (khuyến nghị 4GB+)
2. **Enable WSL 2** trên Windows để hiệu năng tốt hơn
3. **Disable BuildKit** nếu build chậm:
   ```powershell
   $env:DOCKER_BUILDKIT=0
   docker-compose build
   ```

## Liên hệ hỗ trợ

Nếu gặp vấn đề:
- Kiểm tra logs: `docker-compose logs -f`
- Xem CPU/Memory usage: `docker stats`
- Liên hệ team qua Zalo/GitHub issues
