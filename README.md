# Gia Phả Online - Version 7 🌳

Hệ thống quản lý gia phả trực tuyến với đầy đủ tính năng: quản lý thành viên, cây gia phả tương tác, thống kê, và nhiều hơn nữa.

## 🚀 Tính năng chính

- 👥 Quản lý thành viên gia đình (thêm, sửa, xóa)
- 🌳 Cây gia phả tương tác với zoom, pan, và connections
- 📊 Thống kê chi tiết (tổng số, nam/nữ, còn sống/đã mất)
- 🖼️ Upload và quản lý ảnh đại diện, ảnh nền
- 📥 Xuất cây gia phả (PNG A4/A3, ngang/dọc)
- 🎨 Tùy chỉnh hiển thị (scale, màu sắc, layout)
- 🔍 Xem theo nhánh, lọc thành viên
- 📱 Responsive design với Angular Material

## 🏗️ Kiến trúc

- **Backend:** NestJS + MongoDB (Mongoose)
- **Frontend:** Angular 20 + Angular Material
- **Database:** MongoDB Atlas (Cloud)
- **Deployment:** Docker + Docker Compose

## 📋 Yêu cầu

### Development:
- Node.js 20+
- npm 10+
- MongoDB Atlas account (miễn phí)

### Production (Docker):
- Docker & Docker Compose
- MongoDB Atlas account

## 🐳 Quick Start với Docker (Khuyến nghị)

### Bước 1: Cấu hình MongoDB Atlas

1. Tạo file `.env` từ template:
```bash
cp .env.example .env
```

2. Cập nhật connection string trong `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/giapha?retryWrites=true&w=majority
```

### Bước 2: Chạy ứng dụng

**Windows PowerShell:**
```powershell
# Load helper functions
. .\docker-management.ps1

# Quick start (với environment check)
Quick-Start

# Hoặc manual
Start-GiaPha
```

**Linux/Mac:**
```bash
# Make script executable
chmod +x docker-management.sh

# Quick start
./docker-management.sh quick-start

# Hoặc manual
./docker-management.sh start
```

### Bước 3: Truy cập ứng dụng

- **Frontend:** http://localhost
- **Backend API:** http://localhost:3000/api

### Các lệnh Docker hữu ích

```bash
# Xem logs
docker-compose logs -f

# Xem status
docker-compose ps

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build
```

📖 **Chi tiết đầy đủ:** Xem [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md)

---

## 💻 Development Mode (Local)

### 1. Cài đặt dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd web
npm install
```

### 2. Cấu hình

Tạo file `server/.env`:
```env
PORT=3000
MONGODB_URI=mongodb+srv://your-connection-string
```

### 3. Chạy development servers

**Backend:**
```bash
cd server
npm run start:dev
```

**Frontend:**
```bash
cd web
npm start
```

- Backend: http://localhost:3000
- Frontend: http://localhost:4200

---

## 📚 API Endpoints

### Families (Dòng họ)
- `GET /api/families` - Danh sách dòng họ
- `POST /api/families` - Tạo dòng họ mới
- `PATCH /api/families/:id` - Cập nhật dòng họ
- `DELETE /api/families/:id` - Xóa dòng họ

### Members (Thành viên)
- `GET /api/members` - Danh sách thành viên (có filter, search)
- `GET /api/members/:id` - Chi tiết thành viên
- `POST /api/members` - Tạo thành viên mới
- `PATCH /api/members/:id` - Cập nhật thành viên
- `DELETE /api/members/:id` - Xóa thành viên
- `POST /api/members/:id/photo` - Upload ảnh đại diện
- `GET /api/members/tree/:rootId` - Lấy cây gia phả từ root

### Unions (Hôn phối)
- `GET /api/unions` - Danh sách quan hệ hôn phối
- `POST /api/unions` - Tạo quan hệ hôn phối
- `DELETE /api/unions/:id` - Xóa quan hệ

### Users (Người dùng)
- `GET /api/users` - Danh sách người dùng
- `POST /api/users` - Tạo người dùng
- `PATCH /api/users/:id` - Cập nhật người dùng
- `DELETE /api/users/:id` - Xóa người dùng

### Backgrounds (Ảnh nền)
- `GET /api/backgrounds` - Danh sách ảnh nền
- `POST /api/backgrounds` - Upload ảnh nền
- `DELETE /api/backgrounds/:id` - Xóa ảnh nền

---

## 🛠️ Docker Management Scripts

### PowerShell (Windows)

```powershell
# Load functions
. .\docker-management.ps1

# Các lệnh available
Start-GiaPha                              # Start tất cả services
Stop-GiaPha                               # Stop tất cả services
Restart-GiaPha                            # Restart services
Get-GiaPhaStatus                          # Xem status
Show-GiaPhaLogs                           # Xem logs
Show-GiaPhaLogs -Service backend          # Logs của backend
Rebuild-GiaPhaService -Service backend    # Rebuild backend
Backup-GiaPhaUploads                      # Backup uploads
Test-GiaPhaEnvironment                    # Check .env config
```

### Bash (Linux/Mac)

```bash
chmod +x docker-management.sh

./docker-management.sh start              # Start services
./docker-management.sh stop               # Stop services
./docker-management.sh restart            # Restart services
./docker-management.sh status             # Xem status
./docker-management.sh logs               # Xem logs
./docker-management.sh logs backend       # Logs của backend
./docker-management.sh rebuild backend    # Rebuild backend
./docker-management.sh backup             # Backup uploads
./docker-management.sh check              # Check .env config
```

---

## 📁 Cấu trúc Project

```
giapha5-version7/
├── server/                    # Backend NestJS
│   ├── src/
│   │   ├── members/          # Module quản lý thành viên
│   │   ├── families/         # Module dòng họ
│   │   ├── unions/           # Module hôn phối
│   │   ├── users/            # Module người dùng
│   │   ├── backgrounds/      # Module ảnh nền
│   │   └── audit/            # Module audit logs
│   ├── Dockerfile
│   └── .env.example
├── web/                       # Frontend Angular
│   ├── src/
│   │   └── app/
│   │       ├── features/     # Feature modules
│   │       │   ├── members/  # Quản lý thành viên
│   │       │   ├── families/ # Quản lý dòng họ
│   │       │   └── users/    # Quản lý users
│   │       └── core/         # Core services
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml         # Docker Compose config
├── .env.example              # Environment template
├── docker-management.ps1     # PowerShell helper
├── docker-management.sh      # Bash helper
├── DOCKER_DEPLOY.md          # Docker deployment guide
└── README.md                 # This file
```

---

## 🔧 Troubleshooting

### Backend không kết nối được MongoDB Atlas

```bash
# Kiểm tra connection string
docker-compose exec backend printenv MONGODB_URI

# Kiểm tra logs
docker-compose logs backend
```

**Giải pháp:**
- Kiểm tra username/password trong connection string
- Kiểm tra IP whitelist trong MongoDB Atlas (cho phép 0.0.0.0/0)
- Kiểm tra network của container

### Frontend không load được

```bash
# Kiểm tra nginx config
docker-compose exec frontend cat /etc/nginx/nginx.conf

# Restart frontend
docker-compose restart frontend
```

### Port đã được sử dụng

Sửa port trong `docker-compose.yml`:
```yaml
frontend:
  ports:
    - '8080:80'  # Thay 80 thành port khác
```

---

## 📝 License

Private project - All rights reserved

---

## 👥 Contributors

- Development Team

---

## 📞 Support

Để được hỗ trợ, vui lòng tạo issue trong repository hoặc liên hệ team phát triển.
