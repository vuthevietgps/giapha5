# Hướng dẫn Deploy Gia Phả Version 7 với Docker

## Yêu cầu

- Docker và Docker Compose đã được cài đặt
- Tài khoản MongoDB Atlas (miễn phí)
- Connection string từ MongoDB Atlas

## Bước 1: Cấu hình MongoDB Atlas Connection String

1. Tạo file `.env` trong thư mục gốc của project:

```bash
cp .env.example .env
```

2. Mở file `.env` và thay thế connection string với thông tin MongoDB Atlas của bạn:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/giapha?retryWrites=true&w=majority
```

**Lưu ý:** 
- Thay `username` và `password` bằng thông tin đăng nhập MongoDB Atlas
- Thay `cluster` bằng tên cluster của bạn
- Database name là `giapha`

## Bước 2: Build và chạy Docker containers

### Chạy lần đầu (build images):

```bash
docker-compose up -d --build
```

### Chạy lại (không build):

```bash
docker-compose up -d
```

## Bước 3: Kiểm tra trạng thái

```bash
docker-compose ps
```

Bạn sẽ thấy 2 containers đang chạy:
- `giapha-version7-backend` - Backend API (port 3000)
- `giapha-version7-frontend` - Frontend Web (port 80)

## Bước 4: Truy cập ứng dụng

- **Frontend (Web):** http://localhost hoặc http://localhost:80
- **Backend API:** http://localhost:3000/api

## Các lệnh hữu ích

### Xem logs:

```bash
# Xem tất cả logs
docker-compose logs -f

# Xem logs của backend
docker-compose logs -f backend

# Xem logs của frontend
docker-compose logs -f frontend
```

### Dừng containers:

```bash
docker-compose down
```

### Dừng và xóa volumes (xóa dữ liệu uploads):

```bash
docker-compose down -v
```

### Restart containers:

```bash
docker-compose restart
```

### Rebuild một service cụ thể:

```bash
# Rebuild backend
docker-compose up -d --build backend

# Rebuild frontend
docker-compose up -d --build frontend
```

### Xem thông tin chi tiết container:

```bash
docker-compose exec backend sh
docker-compose exec frontend sh
```

## Cấu trúc Docker

### Backend (NestJS)
- **Base Image:** Node 20 Alpine
- **Port:** 3000
- **Volume:** uploads-data (lưu trữ ảnh tải lên)
- **Environment Variables:** MONGODB_URI, PORT, NODE_ENV

### Frontend (Angular + Nginx)
- **Base Image:** Nginx Alpine
- **Port:** 80
- **Proxy:** API requests được proxy đến backend
- **Static Files:** Served by Nginx

## Lưu ý quan trọng

1. **MongoDB Atlas IP Whitelist:** 
   - Đảm bảo IP của server Docker được thêm vào whitelist trong MongoDB Atlas
   - Hoặc cho phép truy cập từ mọi IP (0.0.0.0/0) cho development

2. **Dữ liệu uploads:**
   - Ảnh tải lên được lưu trong Docker volume `uploads-data`
   - Để backup, sử dụng: `docker cp giapha-version7-backend:/app/uploads ./uploads-backup`

3. **Production Deployment:**
   - Thay đổi port 80 thành port khác nếu cần
   - Cấu hình SSL/HTTPS với reverse proxy (nginx, traefik, etc.)
   - Đặt NODE_ENV=production

4. **Monitoring:**
   - Containers có health checks tự động
   - Frontend chỉ start sau khi backend healthy

## Troubleshooting

### Backend không kết nối được MongoDB Atlas:

```bash
# Kiểm tra logs
docker-compose logs backend

# Kiểm tra connection string
docker-compose exec backend printenv MONGODB_URI
```

### Frontend không load được:

```bash
# Kiểm tra nginx config
docker-compose exec frontend cat /etc/nginx/nginx.conf

# Restart frontend
docker-compose restart frontend
```

### Port đã được sử dụng:

Thay đổi port mapping trong `docker-compose.yml`:

```yaml
frontend:
  ports:
    - '8080:80'  # Thay 80 bằng port khác
```

## Cập nhật code

Sau khi thay đổi code:

```bash
# Rebuild và restart
docker-compose up -d --build

# Hoặc rebuild từng service
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

## Production Checklist

- [ ] Đã cấu hình MONGODB_URI đúng
- [ ] MongoDB Atlas IP whitelist đã được cấu hình
- [ ] Đã test kết nối database
- [ ] Đã cấu hình backup cho uploads volume
- [ ] Đã cấu hình SSL/HTTPS
- [ ] Đã setup monitoring và logging
- [ ] Đã test tất cả tính năng chính
