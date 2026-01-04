# Deploy Gia Phả Version 7 từ Docker Hub

## 🚀 Quick Deploy

### Bước 1: Chuẩn bị

Trên server/máy tính đích, đảm bảo đã cài:
- Docker
- Docker Compose

### Bước 2: Tạo file cấu hình

```bash
# Tạo thư mục project
mkdir giapha-version7
cd giapha-version7

# Tạo file .env
nano .env
```

Thêm nội dung vào file `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/giapha?retryWrites=true&w=majority
```

### Bước 3: Tạo docker-compose.yml

```bash
nano docker-compose.yml
```

Thêm nội dung:
```yaml
version: '3.9'

services:
  backend:
    image: vutheviet/giapha5:server-version7
    container_name: giapha-version7-backend
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      - PORT=3000
      - MONGODB_URI=${MONGODB_URI}
      - NODE_ENV=production
    volumes:
      - uploads-data:/app/uploads
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  frontend:
    image: vutheviet/giapha5:web-version7
    container_name: giapha-version7-frontend
    restart: unless-stopped
    ports:
      - '80:80'
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  uploads-data:
```

### Bước 4: Khởi chạy

```bash
# Pull images và start containers
docker-compose up -d

# Xem logs
docker-compose logs -f

# Kiểm tra status
docker-compose ps
```

### Bước 5: Truy cập

- **Frontend**: http://localhost hoặc http://your-server-ip
- **Backend API**: http://localhost:3000/api

---

## 📦 Docker Images trên Docker Hub

### Backend (Server)
```bash
docker pull vutheviet/giapha5:server-version7
```
- **Size**: ~296MB
- **Base**: Node 20 Alpine
- **Port**: 3000

### Frontend (Web)
```bash
docker pull vutheviet/giapha5:web-version7
```
- **Size**: ~82MB  
- **Base**: Nginx Alpine
- **Port**: 80

---

## 🔧 Các lệnh hữu ích

### Quản lý containers

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# Xem logs
docker-compose logs -f

# Xem logs của service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend

# Xem status
docker-compose ps
```

### Cập nhật version mới

```bash
# Pull images mới nhất
docker-compose pull

# Recreate containers với images mới
docker-compose up -d --force-recreate
```

### Backup uploads

```bash
# Backup
docker cp giapha-version7-backend:/app/uploads ./uploads-backup

# Restore
docker cp ./uploads-backup/. giapha-version7-backend:/app/uploads/
```

---

## 🌐 Deploy lên VPS/Cloud

### 1. Digital Ocean / AWS / Azure

```bash
# SSH vào server
ssh user@your-server-ip

# Cài Docker và Docker Compose (nếu chưa có)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Cài Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Tạo thư mục và deploy
mkdir ~/giapha-version7
cd ~/giapha-version7

# Tạo file .env và docker-compose.yml như hướng dẫn ở trên

# Khởi chạy
docker-compose up -d
```

### 2. Cấu hình Domain và SSL (Optional)

Nếu bạn có domain name, sử dụng Nginx reverse proxy hoặc Traefik:

```bash
# Thay đổi port trong docker-compose.yml
# Frontend ports: '8080:80' thay vì '80:80'

# Sau đó cấu hình Nginx trên host với Let's Encrypt SSL
```

---

## 🔒 Production Checklist

- [ ] MongoDB Atlas connection string đã được cấu hình
- [ ] IP whitelist trong MongoDB Atlas
- [ ] File .env đã được tạo và bảo mật
- [ ] Ports 80 và 3000 available (hoặc đã thay đổi)
- [ ] Firewall rules đã được cấu hình
- [ ] SSL/HTTPS đã được setup (khuyến nghị)
- [ ] Backup strategy cho uploads volume
- [ ] Monitoring và logging đã được setup
- [ ] Test tất cả chức năng

---

## 📊 Thông tin Images

### Version 7 Features:
- ✅ Kết nối MongoDB Atlas (cloud database)
- ✅ Multi-stage builds (optimized size)
- ✅ Health checks tự động
- ✅ Volume persistence cho uploads
- ✅ Nginx proxy cho API/uploads
- ✅ Production ready configuration

### Image Tags:
- `vutheviet/giapha5:server-version7` - Backend (NestJS)
- `vutheviet/giapha5:web-version7` - Frontend (Angular + Nginx)

### Previous Versions:
- `server-version6` / `web-version6`
- `server-version5` / `web-version5`
- `server-version4` / `web-version4`
- `server-version3` / `web-version3`

---

## 🆘 Troubleshooting

### Backend không kết nối được MongoDB

```bash
# Kiểm tra logs
docker-compose logs backend

# Kiểm tra environment variable
docker-compose exec backend env | grep MONGODB_URI
```

**Giải pháp:**
- Kiểm tra connection string trong .env
- Verify IP whitelist trong MongoDB Atlas
- Test connection string với MongoDB Compass

### Port đã được sử dụng

```bash
# Kiểm tra port
netstat -ano | findstr :80
netstat -ano | findstr :3000

# Hoặc thay đổi port trong docker-compose.yml
frontend:
  ports:
    - '8080:80'  # Thay 80 thành port khác
```

### Images pull chậm

```bash
# Pull manually trước
docker pull vutheviet/giapha5:server-version7
docker pull vutheviet/giapha5:web-version7

# Sau đó start
docker-compose up -d
```

---

## 📞 Support

- **Docker Hub**: https://hub.docker.com/r/vutheviet/giapha5
- **Repository**: https://github.com/vuthevietgps/giapha5

---

**Last Updated**: December 2025  
**Version**: 7.0  
**Status**: Production Ready ✅
