# ✅ ỨNG DỤNG GIA PHẢ ONLINE VERSION 2.0 ĐÃ SẴN SÀNG!

## 🎉 Build thành công

Ứng dụng Gia Phả Online version 2.0 đã được đóng gói và đang chạy trên Docker Desktop!

## 🌐 Truy cập ngay

### Website chính
**http://localhost:8080**

### Quản lý Database
**http://localhost:8081**
- Username: `admin`
- Password: `pass`

### API Backend
**http://localhost:8080/api**

## 👤 Tài khoản test

### Super Admin (Quản trị hệ thống)
- Email: `superadmin@giapha.system`
- Password: `SuperAdmin@123`

### Admin (Quản lý dòng họ)
- Email: `admin1@giapha.test` (hoặc admin2, admin3)
- Password: `Admin@123`

## 📦 Các containers đang chạy

```
✅ giapha5-mongo-1           - MongoDB Database (port 27017)
✅ giapha5-mongo-express-1   - MongoDB Web UI (port 8081)
✅ giapha5-server-1          - NestJS Backend API
✅ giapha5-web-1             - Angular Frontend + Nginx (port 8080)
```

## 🔍 Kiểm tra trạng thái

```powershell
# Xem containers đang chạy
docker-compose ps

# Xem logs tất cả services
docker-compose logs -f

# Xem logs từng service
docker-compose logs -f web
docker-compose logs -f server
docker-compose logs -f mongo
```

## 🛠️ Các lệnh hữu ích

### Dừng containers
```powershell
docker-compose stop
```

### Dừng và xóa containers (giữ lại data)
```powershell
docker-compose down
```

### Khởi động lại
```powershell
docker-compose up -d
```

### Rebuild khi có thay đổi code
```powershell
docker-compose up -d --build
```

### Reset hoàn toàn (xóa cả database)
```powershell
docker-compose down -v
docker-compose up -d --build
```

### Xem resource usage
```powershell
docker stats
```

## ✨ Tính năng mới trong Version 2.0

- ✅ Giao diện responsive cho mobile/tablet/desktop
- ✅ Hệ thống thông báo sự kiện (calendar events)
- ✅ Hỗ trợ cài đặt Android và iOS
- ✅ Cải tiến pricing với mô hình per-user/year
- ✅ Trang mobile-setup với hướng dẫn chi tiết
- ✅ Cải thiện hiệu năng và tối ưu Docker

## 📝 Ghi chú quan trọng

1. **Database được lưu trong Docker volume**: Dữ liệu sẽ được giữ lại khi restart containers
2. **Uploads folder**: Ảnh được lưu trong `./uploads` trên host machine
3. **Port conflicts**: Nếu port 8080 hoặc 27017 bị chiếm, chỉnh sửa trong `docker-compose.yml`

## 🐛 Troubleshooting

### Lỗi kết nối MongoDB
```powershell
docker-compose restart mongo
docker-compose logs mongo
```

### Website không load
```powershell
docker-compose logs web
docker-compose restart web
```

### API không hoạt động
```powershell
docker-compose logs server
docker-compose restart server
```

### Rebuild hoàn toàn
```powershell
docker-compose down -v
docker rmi giapha-server:local giapha-web:local -f
docker-compose up -d --build
```

## 📚 Tài liệu bổ sung

- `DOCKER_SETUP.md` - Hướng dẫn chi tiết về Docker
- `QUICK_START.md` - Hướng dẫn nhanh
- `IOS_BUILD_GUIDE.md` - Hướng dẫn build iOS app
- `MOBILE_README.md` - Hướng dẫn mobile app

## 🎯 Test ngay

1. Mở trình duyệt: http://localhost:8080
2. Đăng nhập với tài khoản super admin
3. Test các chức năng:
   - ✅ Quản lý người dùng
   - ✅ Quản lý dòng họ
   - ✅ Thêm/sửa thành viên
   - ✅ Upload ảnh
   - ✅ Xem cây gia phả
   - ✅ Viết bài post
   - ✅ Xem lịch vạn niên
   - ✅ Pricing & Thanh toán
   - ✅ Mobile setup instructions

## 🚀 Deploy lên production

Khi sẵn sàng deploy lên server:

1. Chuẩn bị server Linux (Ubuntu 20.04+)
2. Cài Docker và Docker Compose
3. Upload code lên server
4. Chỉnh sửa `docker-compose.prod.yml`
5. Chạy: `docker-compose -f docker-compose.prod.yml up -d --build`

Chi tiết xem trong `DEPLOY_NOTES.md`

---

**Chúc mừng! Ứng dụng Gia Phả Online version 2.0 của bạn đã sẵn sàng! 🎊**
