# Hướng dẫn Deploy Gia Phả Version 7 lên dongtocvietnam.com

## 🎯 Thông tin

- **Domain**: dongtocvietnam.com
- **Server IP**: 192.168.100.237
- **Backend Port**: 3000
- **Frontend Port**: 8091 (internal), 80/443 (via Cloudflare)
- **Images**: 
  - `vutheviet/giapha5:server-version7`
  - `vutheviet/giapha5:web-version7`

---

## 📋 Yêu cầu

### Trên Server (192.168.100.237)

1. **Docker & Docker Compose**
```bash
# Kiểm tra
docker --version
docker-compose --version
```

2. **Cloudflare Tunnel (cloudflared)**
```bash
# Kiểm tra
systemctl status cloudflared
```

3. **Permissions**
```bash
# User cần có quyền sudo hoặc chạy với root
```

---

## 🚀 Cách Deploy

### Bước 1: Chuẩn bị trên máy local

1. Copy script lên server:
```bash
# Trên máy Windows (PowerShell)
scp deploy-dongtocvietnam.sh user@192.168.100.237:/tmp/

# Hoặc dùng WinSCP/FileZilla
```

### Bước 2: SSH vào server

```bash
ssh user@192.168.100.237
```

### Bước 3: Chạy script deploy

```bash
# Di chuyển và set permission
cd /tmp
chmod +x deploy-dongtocvietnam.sh

# Chạy với sudo
sudo ./deploy-dongtocvietnam.sh
```

Script sẽ yêu cầu nhập MongoDB URI. Nhập connection string của MongoDB Atlas:
```
mongodb+srv://username:password@cluster.mongodb.net/giapha?retryWrites=true&w=majority
```

### Bước 4: Cấu hình Cloudflare

1. **Đăng nhập Cloudflare Dashboard**: https://dash.cloudflare.com

2. **Thêm domain dongtocvietnam.com**:
   - Click "Add a Site"
   - Nhập: `dongtocvietnam.com`
   - Chọn plan (Free)
   - Cloudflare sẽ scan DNS records

3. **Cập nhật Nameservers** (tại nhà cung cấp domain):
   - Thay đổi nameservers thành Cloudflare nameservers
   - Ví dụ: 
     - `ns1.cloudflare.com`
     - `ns2.cloudflare.com`

4. **Tạo DNS Records** (trong Cloudflare):
   
   **Lấy Tunnel ID trước:**
   ```bash
   # Trên server
   sudo cat /etc/cloudflared/config.yml | grep tunnel
   ```
   
   Hoặc:
   ```bash
   sudo cloudflared tunnel list
   ```

   **Tạo CNAME records:**
   - Type: `CNAME`
   - Name: `@`
   - Target: `[tunnel-id].cfargotunnel.com`
   - Proxy: ✅ Proxied (orange cloud)
   
   - Type: `CNAME`
   - Name: `www`
   - Target: `[tunnel-id].cfargotunnel.com`
   - Proxy: ✅ Proxied (orange cloud)

5. **SSL/TLS Settings**:
   - SSL/TLS → Overview → Encryption mode: **Full** hoặc **Full (strict)**

---

## 🔧 Cấu hình chi tiết

### Cấu trúc thư mục trên server

```
/opt/websites/sites/dongtocvietnam-com/
├── .env                    # Environment variables
├── docker-compose.yml      # Docker Compose config
└── uploads-data/           # Volume cho uploads (auto-created)
```

**Note:** Port 8091 được chọn vì port 8090 đã bị htxbachgia-shop sử dụng.

### File docker-compose.yml

Được tạo tự động bởi script với:
- Backend: port 3000
- Frontend: port 8090 → expose qua Cloudflare
- Traefik labels cho routing
- Health checks

### Cloudflare Tunnel Config

Script tự động thêm vào `/etc/cloudflared/config.yml`:
```yaml
ingress:
  - hostname: dongtocvietnam.com
    service: http://127.0.0.1:8091
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
      tlsTimeout: 30s
  - hostname: www.dongtocvietnam.com
    service: http://127.0.0.1:8091
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
      tlsTimeout: 30s
  # ... other rules ...
  - service: http_status:404
```

---

## ✅ Kiểm tra sau khi Deploy

### 1. Kiểm tra containers

```bash
cd /opt/websites/sites/dongtocvietnam-com
sudo docker-compose ps
```

Expected output:
```
NAME                        STATUS              PORTS
dongtocvietnam-backend      Up (healthy)        0.0.0.0:3000->3000/tcp
dongtocvietnam-frontend     Up                  0.0.0.0:8091->80/tcp
```

### 2. Kiểm tra logs

```bash
# Tất cả logs
sudo docker-compose logs -f

# Chỉ backend
sudo docker-compose logs -f backend

# Chỉ frontend
sudo docker-compose logs -f frontend
```

### 3. Test local endpoints

```bash
# Backend API
curl -I http://localhost:3000/api

# Frontend
curl -I http://localhost:8091
```

### 4. Kiểm tra Cloudflare Tunnel

```bash
# Status
sudo systemctl status cloudflared

# Logs
sudo journalctl -u cloudflared -f

# Test tunnel
curl -I https://dongtocvietnam.com
```

### 5. Test từ bên ngoài

```bash
# Từ máy khác hoặc browser
curl -I https://dongtocvietnam.com
curl -I https://www.dongtocvietnam.com

# Kiểm tra API
curl https://dongtocvietnam.com/api
```

---

## 🔄 Quản lý

### Start/Stop/Restart

```bash
cd /opt/websites/sites/dongtocvietnam-com

# Stop
sudo docker-compose down

# Start
sudo docker-compose up -d

# Restart
sudo docker-compose restart

# Restart specific service
sudo docker-compose restart backend
sudo docker-compose restart frontend
```

### Cập nhật version mới

```bash
cd /opt/websites/sites/dongtocvietnam-com

# Pull images mới
sudo docker pull vutheviet/giapha5:server-version7
sudo docker pull vutheviet/giapha5:web-version7

# Recreate containers
sudo docker-compose up -d --force-recreate
```

### Xem logs

```bash
# Real-time logs
sudo docker-compose logs -f

# Last 100 lines
sudo docker-compose logs --tail=100

# Logs từ thời điểm cụ thể
sudo docker-compose logs --since 10m
```

### Backup uploads

```bash
# Backup
sudo docker cp dongtocvietnam-backend:/app/uploads /backup/dongtocvietnam-uploads-$(date +%Y%m%d)

# Restore
sudo docker cp /backup/dongtocvietnam-uploads-20251201/. dongtocvietnam-backend:/app/uploads/
```

---

## 🐛 Troubleshooting

### Backend không start

**Kiểm tra:**
```bash
sudo docker-compose logs backend
```

**Common issues:**
1. MongoDB connection failed
   - Verify MONGODB_URI in `.env`
   - Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0)
   
2. Port 3000 already in use
   ```bash
   sudo netstat -tulpn | grep 3000
   sudo lsof -i :3000
   ```

### Frontend không accessible

**Kiểm tra:**
```bash
sudo docker-compose logs frontend
curl -I http://localhost:8090
```

**Common issues:**
1. Backend not healthy → Frontend waits
2. Nginx config issue → Check logs

### Cloudflare Tunnel không hoạt động

**Kiểm tra:**
```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -n 50
```

**Common issues:**
1. Tunnel not running
   ```bash
   sudo systemctl start cloudflared
   sudo systemctl enable cloudflared
   ```

2. Config syntax error
   ```bash
   sudo cloudflared tunnel ingress validate
   ```

3. DNS chưa propagate
   - Đợi 5-10 phút
   - Check: https://dnschecker.org

### Cannot connect via domain

**Kiểm tra từng layer:**

1. **Server local:**
   ```bash
   curl -I http://localhost:8090
   ```

2. **Cloudflare Tunnel:**
   ```bash
   sudo systemctl status cloudflared
   sudo journalctl -u cloudflared | grep dongtocvietnam
   ```

3. **DNS:**
   ```bash
   nslookup dongtocvietnam.com
   dig dongtocvietnam.com
   ```

4. **SSL/TLS:**
   - Check Cloudflare SSL settings
   - Should be "Full" or "Full (strict)"

---

## 📊 Monitoring

### Container resources

```bash
# Real-time stats
docker stats dongtocvietnam-backend dongtocvietnam-frontend

# Disk usage
docker system df
```

### Logs rotation

```bash
# Configure in docker-compose.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 🔐 Security

### Firewall rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (Cloudflare)
sudo ufw allow 443/tcp     # HTTPS (Cloudflare)
sudo ufw enable
```

### Cloudflare IP ranges

Only allow Cloudflare IPs to access ports 80/443:
```bash
# Get Cloudflare IP ranges
curl https://www.cloudflare.com/ips-v4
curl https://www.cloudflare.com/ips-v6

# Add to firewall
# (This is advanced - use with caution)
```

### Environment variables

```bash
# .env file should not be readable by others
sudo chmod 600 .env
```

---

## 📞 Support

- **Server**: 192.168.100.237
- **Domain**: https://dongtocvietnam.com
- **Images**: https://hub.docker.com/r/vutheviet/giapha5

---

**Deployed**: December 2025  
**Version**: 7.0  
**Status**: Production Ready ✅
