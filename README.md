# Gia phả Online (NestJS + Angular + MongoDB)

Dự án webapp quản lý gia phả. Trước mắt triển khai chức năng Quản lý người dùng (thêm/sửa/xóa) với các trường: họ tên, email đăng nhập, mật khẩu, vai trò (Giám đốc, Quản lý, Nhân viên).

## Kiến trúc
- Backend: NestJS (server/) + MongoDB (Mongoose)
- Frontend: Angular (web/) + Angular Material
- Docker Compose: MongoDB (+ mongo-express tuỳ chọn)

## Yêu cầu
- Node.js 18+
- npm 10+
- Docker Desktop (tuỳ chọn, để chạy MongoDB nhanh)

## Chạy nhanh trên máy (dev)

1) Khởi động MongoDB bằng Docker (khuyến nghị)

```powershell
# Tại thư mục gốc dự án
docker compose up -d
```

Mặc định backend dùng URI: `mongodb://localhost:27017/giapha` (không auth). Bạn có thể đổi `server/.env`.

2) Backend (NestJS)

```powershell
# Tại thư mục gốc dự án
cd .\server
copy .env.example .env
# (Sửa .env nếu cần)
npm run start:dev
```

API sẽ chạy tại: http://localhost:3000/api

3) Frontend (Angular)

```powershell
# Cửa sổ khác
cd .\web
npm start
```

Web chạy tại: http://localhost:4200

## Tác vụ VS Code (tuỳ chọn)
Bạn có thể dùng Tasks để chạy cả hai app:
- Mở Command Palette > "Run Task" > chọn `dev: both`

## API (Người dùng)
- POST /api/users (tạo mới) body: { fullName, email, password, role }
- GET /api/users (danh sách)
- GET /api/users/:id (chi tiết)
- PATCH /api/users/:id (cập nhật) body: các trường cần cập nhật (password không bắt buộc)
- DELETE /api/users/:id (xóa)

Lưu ý: Mật khẩu được băm (bcrypt) và không trả về trong response.

## Cấu hình
- `server/.env.example`: mẫu cấu hình backend
- `web/src/environments/*`: cấu hình URL API frontend

## Ghi chú phát triển
- Chưa implement phân quyền; sẽ bổ sung sau khi hoàn thiện chức năng.
- UI sử dụng Angular Material cơ bản để thao tác CRUD người dùng.
