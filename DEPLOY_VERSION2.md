# 🚀 Hướng dẫn Deploy Version 2.0 từ Docker Hub

## ✅ Images đã được push lên Docker Hub

### 📦 Docker Hub Repository
**Username:** `vutheviet`  
**Repository:** `giapha5`

### 🏷️ Version 2.0 Tags
- **Server:** `vutheviet/giapha5:server-version2`
  - Size: ~590MB
  - Platform: NestJS + Node 22 Alpine
  - MongoDB Atlas connection
  
- **Web:** `vutheviet/giapha5:web-version2`
  - Size: ~75.5MB
  - Platform: Angular 20 + Nginx Alpine
  - Includes Gia Phả Online version2.0

### 🔗 Docker Hub Links
- Server: https://hub.docker.com/r/vutheviet/giapha5/tags?name=server-version2
- Web: https://hub.docker.com/r/vutheviet/giapha5/tags?name=web-version2

---

## 🖥️ Deploy trên bất kỳ máy nào có Docker

### **Bước 1: Cài Docker**

**Windows/Mac:**
- Tải Docker Desktop: https://www.docker.com/products/docker-desktop/

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl start docker
sudo systemctl enable docker
```

### **Bước 2: Pull images từ Docker Hub**

```bash
# Pull cả 2 images
docker pull vutheviet/giapha5:server-version2
docker pull vutheviet/giapha5:web-version2
```

### **Bước 3: Tạo file docker-compose.yml**

Tạo file `docker-compose.yml`:

```yaml
version: '3.9'

services:
  server:
    image: vutheviet/giapha5:server-version2
    restart: unless-stopped
    environment:
      MONGODB_URI: mongodb+srv://allinoneuser:Viet686868@allinone.cniws0g.mongodb.net/giapha?retryWrites=true&w=majority&appName=allinone
      PORT: 3000
      NODE_ENV: production
    volumes:
      - ./uploads:/app/uploads

  web:
    image: vutheviet/giapha5:web-version2
    restart: unless-stopped
    depends_on:
      - server
    ports:
      - "8080:80"
    volumes:
      - ./downloads:/usr/share/nginx/html/downloads
```

### **Bước 4: Khởi động ứng dụng**

```bash
# Khởi động
docker-compose up -d

# Xem logs
docker-compose logs -f

# Kiểm tra trạng thái
docker-compose ps
```

### **Bước 5: Truy cập**

Mở trình duyệt: **http://localhost:8080**

---

## 🌍 Deploy lên VPS/Cloud Server

### **AWS EC2 / DigitalOcean / Linode**

```bash
# 1. SSH vào server
ssh user@your-server-ip

# 2. Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Cài Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Tạo thư mục project
mkdir -p ~/giapha-app
cd ~/giapha-app

# 5. Tạo docker-compose.yml (copy nội dung từ trên)
nano docker-compose.yml

# 6. Tạo thư mục uploads
mkdir -p uploads downloads

# 7. Khởi động
docker-compose up -d

# 8. Xem logs
docker-compose logs -f
```

### **Mở port firewall**

```bash
# Ubuntu/Debian
sudo ufw allow 8080/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### **Setup domain và SSL (optional)**

Nếu có domain (ví dụ: `giapha.com`):

1. **Cài Nginx reverse proxy:**
```bash
sudo apt install nginx
```

2. **Tạo config Nginx:**
```bash
sudo nano /etc/nginx/sites-available/giapha
```

Nội dung:
```nginx
server {
    listen 80;
    server_name giapha.com www.giapha.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. **Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/giapha /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

4. **Cài SSL với Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d giapha.com -d www.giapha.com
```

---

## 🔄 Update lên version mới

Khi có version mới:

```bash
# Pull version mới
docker-compose pull

# Restart với image mới
docker-compose up -d

# Hoặc force recreate
docker-compose up -d --force-recreate
```

---

## 🛠️ Quản lý

### **Xem logs**
```bash
docker-compose logs -f
docker-compose logs -f server
docker-compose logs -f web
```

### **Restart services**
```bash
docker-compose restart
docker-compose restart server
docker-compose restart web
```

### **Stop/Start**
```bash
docker-compose stop
docker-compose start
```

### **Dừng và xóa**
```bash
docker-compose down
```

### **Backup uploads**
```bash
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
```

---

## 📊 Resource Usage

**Minimum requirements:**
- CPU: 1 core
- RAM: 1GB
- Disk: 5GB
- Network: 100Mbps

**Recommended:**
- CPU: 2 cores
- RAM: 2GB
- Disk: 20GB
- Network: 1Gbps

---

## 🔐 Security Notes

1. **Đổi MongoDB password:** Thay đổi connection string trong `docker-compose.yml`
2. **Firewall:** Chỉ mở port 80/443, không mở port 8080 trực tiếp
3. **SSL:** Luôn dùng HTTPS cho production
4. **Backup:** Backup database và uploads thường xuyên

---

## 📞 Support

**Issues:** Report tại GitHub repository  
**Contact:** Zalo/Email support team

---

## 📝 Version History

### Version 2.0 (Current)
- ✅ Giao diện version 2.0
- ✅ Kết nối MongoDB Atlas
- ✅ Responsive mobile/tablet/desktop
- ✅ iOS/Android mobile setup guide
- ✅ Pricing tiers per-user/year
- ✅ Notification system

### Version 1.0
- Initial release
- Basic family tree management
