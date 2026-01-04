# Phân tích Ports trên Server 192.168.100.237

**Ngày kiểm tra:** December 1, 2025  
**Server:** admin001-ProLiant-DL360-Gen9

---

## 📊 Tóm tắt Ports đang sử dụng

### Ports đã sử dụng:
- ❌ **80** - Traefik (HTTP)
- ❌ **443** - Traefik (HTTPS)
- ❌ **8080** - Traefik Dashboard
- ❌ **8081** - ladifinal_web_new
- ❌ **8082** - thelaixedanang-web
- ❌ **8083** - thelaixe-shop-web
- ❌ **8084** - passport24h-web
- ❌ **8085** - hochieu24h-shop-web
- ❌ **8086** - phuhieuxenhanh-shop-web
- ❌ **8087** - phuhieuxebachgia-shop-web
- ❌ **8089** - giftpairstudio-shop-web
- ❌ **8090** - htxbachgia-shop-frontend ⚠️

### Ports có thể sử dụng:
- ✅ **3000** - Đang dùng internal, chưa expose
- ✅ **8091** - **KHUYẾN NGHỊ CHO DONGTOCVIETNAM.COM**
- ✅ **8092** - Available
- ✅ **8093** - Available
- ✅ **8094** - Available
- ✅ **8095** - Available
- ✅ **8096-8099** - Available
- ✅ **9000-9999** - Available

---

## 🐳 Docker Containers đang chạy

```
CONTAINER NAME                  PORT MAPPING              STATUS
--------------------------      --------------------      ------------
traefik                         80, 443, 8080            Up 11 hours
ladifinal_web_new               8081->5000               Up 11 hours (healthy)
thelaixedanang-web              8082->5000               Up 11 hours (healthy)
thelaixe-shop-web               8083->5000               Up 11 hours (healthy)
passport24h-web                 8084->80                 Up 11 hours
hochieu24h-shop-web             8085->5000               Up 11 hours (healthy)
phuhieuxenhanh-shop-web         8086->5000               Up 11 hours (healthy)
phuhieuxebachgia-shop-web       8087->5000               Up 11 hours (healthy)
giftpairstudio-shop-web         8089->5000               Up 11 hours (healthy)
htxbachgia-shop-frontend        8090->80                 Up 11 hours (unhealthy)
htxbachgia-shop-backend         3000 (internal)          Up 11 hours (healthy)
passport24h-server              3000 (internal)          Up 11 hours
```

**Lưu ý:**
- Các backend (NestJS) dùng port 3000 internal, không expose ra ngoài
- Các frontend expose qua ports 8081-8090
- Traefik làm reverse proxy cho tất cả domains

---

## 🌐 Websites đang deploy

Từ thư mục `/opt/websites/sites/`:

1. **erpvip-shop** - ERP system
2. **giftpairstudio-shop** - Port 8089
3. **hochieu24h-shop** - Port 8085
4. **htxbachgia-shop** - Port 8090 (frontend) + 3000 internal (backend)
5. **ladifinal-new** - Port 8081
6. **passport24h** - Port 8084 (web) + 3000 internal (server)
7. **phuhieuxebachgia-shop** - Port 8087
8. **phuhieuxenhanh-shop** - Port 8086
9. **thelaixedanang** - Port 8082
10. **thelaixe-shop** - Port 8083
11. **phuhieutoanquoc** - (old, not running)
12. **site02-site20** - Reserved, not deployed

---

## ⚙️ Infrastructure

### Traefik Reverse Proxy
- **Ports:** 80 (HTTP), 443 (HTTPS), 8080 (Dashboard)
- **Function:** SSL termination, routing, load balancing
- **All domains** được route qua Traefik với HTTPS certificates

### Cloudflare Tunnel
- **Service:** cloudflared
- **Local Port:** 20241
- **Function:** Expose local services to internet via Cloudflare
- **Config:** `/etc/cloudflared/config.yml`

### System Services
- **SSH:** Port 22
- **DNS:** Port 53 (systemd-resolved)
- **SMTP:** Port 25 (Postfix)
- **CUPS:** Port 631 (Print service)

---

## 🎯 Khuyến nghị cho Gia Phả Version 7

### Cấu hình đã chọn:
```yaml
Domain: dongtocvietnam.com
Backend Port: 3000 (internal only)
Frontend Port: 8091 (external) -> 80 (container internal)
```

### Lý do chọn port 8091:
1. ✅ Port 8090 đã bị htxbachgia-shop sử dụng
2. ✅ Port 8091 chưa có container nào dùng
3. ✅ Nằm trong dải 8080-8099 (convention)
4. ✅ Dễ nhớ và quản lý

### Kiểm tra port trước khi deploy:
```bash
# Kiểm tra port có đang dùng không
sudo netstat -tlnp | grep :8091

# Nếu trống (không output) => port available
```

---

## 🔧 Commands hữu ích

### Kiểm tra ports đang LISTEN:
```bash
sudo netstat -tlnp | grep LISTEN
```

### Kiểm tra port cụ thể:
```bash
sudo lsof -i :8091
sudo netstat -tlnp | grep :8091
```

### Kiểm tra Docker containers:
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
```

### Tìm port trống:
```bash
# Check range 8091-8099
for port in {8091..8099}; do
    if ! sudo netstat -tlnp | grep -q ":$port "; then
        echo "Port $port is available"
    fi
done
```

### Kiểm tra Cloudflare Tunnel:
```bash
sudo systemctl status cloudflared
sudo cat /etc/cloudflared/config.yml
```

---

## 📋 Checklist trước khi deploy

- [ ] Kiểm tra port 8091 available: `sudo netstat -tlnp | grep :8091`
- [ ] Kiểm tra port 3000 có container nào xung đột không
- [ ] Verify Docker images đã pull: `docker images vutheviet/giapha5`
- [ ] Kiểm tra Cloudflare Tunnel đang chạy: `sudo systemctl status cloudflared`
- [ ] Verify MongoDB Atlas connection string
- [ ] Backup data nếu có website cũ

---

## 🚨 Troubleshooting Port Conflicts

### Nếu port 8091 bị xung đột:

**Option 1: Tìm port khác**
```bash
# Tự động tìm port trống
for port in {8091..8099}; do
    if ! sudo netstat -tlnp | grep -q ":$port "; then
        echo "Use port $port"
        break
    fi
done
```

**Option 2: Stop container đang dùng port**
```bash
# Tìm container đang dùng port
docker ps | grep 8091

# Stop container (nếu không cần thiết)
docker stop <container_name>
```

**Option 3: Đổi port trong script**
```bash
# Edit deploy-dongtocvietnam.sh
# Thay đổi FRONTEND_PORT="8091" thành port khác
```

---

## 📞 Contact

**Server Admin:** admin-001@192.168.100.237  
**New Website:** dongtocvietnam.com (Port 8091)

---

**Last Updated:** December 1, 2025  
**Status:** Port 8091 confirmed available ✅
