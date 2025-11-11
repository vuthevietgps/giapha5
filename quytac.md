# Quy tắc tổ chức cấu trúc file (NestJS + Angular)

Tài liệu này chuẩn hóa cấu trúc thư mục, quy ước đặt tên và quy trình tạo mới chức năng cho dự án Gia phả Online.

## 1) Cấu trúc tổng thể monorepo

```
.
├─ server/                  # Backend NestJS
│  ├─ src/
│  │  ├─ common/            # (tùy chọn) helper chung: pipes, guards, interceptors, filters, utils
│  │  ├─ config/            # (tùy chọn) cấu hình app, schema validation env
│  │  ├─ users/             # ví dụ 1 feature
│  │  │  ├─ dto/
│  │  │  ├─ schemas/
│  │  │  ├─ users.controller.ts
│  │  │  ├─ users.service.ts
│  │  │  └─ users.module.ts
│  │  ├─ app.module.ts
│  │  ├─ app.controller.ts
│  │  └─ main.ts
│  ├─ test/                 # e2e tests
│  ├─ .env.example
│  └─ package.json
│
├─ web/                     # Frontend Angular (standalone)
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ features/
│  │  │  │  ├─ users/       # ví dụ 1 feature
│  │  │  │  │  ├─ pages/
│  │  │  │  │  │  ├─ user-list/
│  │  │  │  │  │  └─ user-form/
│  │  │  │  │  ├─ components/   # (tùy chọn) các component con tái sử dụng
│  │  │  │  │  ├─ models/
│  │  │  │  │  └─ services/
│  │  │  ├─ app.config.ts
│  │  │  ├─ app.routes.ts
│  │  │  ├─ app.html
│  │  │  └─ app.scss
│  │  ├─ environments/
│  │  ├─ index.html
│  │  ├─ main.ts
│  │  └─ styles.scss
│  └─ package.json
│
├─ .vscode/                 # tasks, settings (dev UX)
├─ docker-compose.yml       # MongoDB + mongo-express (dev)
├─ README.md
└─ quytac.md                # tài liệu này
```

## 2) Backend (NestJS) – cấu trúc & quy ước

- Tổ chức theo domain/feature: `src/<feature>`.
- Mỗi feature gồm:
  - `dto/`: DTO request/response (class-validator, class-transformer)
  - `schemas/` (với Mongoose) hoặc `entities/` (với TypeORM)
  - `<feature>.service.ts`: business logic, không phụ thuộc framework UI
  - `<feature>.controller.ts`: ánh xạ route REST, validate input, trả về dữ liệu
  - `<feature>.module.ts`: đăng ký provider, import model/schema
- Tên file và class:
  - File: kebab-case, Class: PascalCase, method/prop: camelCase.
  - DTO: `CreateThingDto`, `UpdateThingDto`, `QueryThingDto`.
- Đường dẫn REST:
  - Base theo số nhiều: `/api/users`, `/api/families`, v.v.
  - Chuẩn CRUD: POST `/`, GET `/`, GET `/:id`, PATCH `/:id`, DELETE `/:id`.
- Validation & bảo mật:
  - Bật `ValidationPipe` global (whitelist, transform, forbidNonWhitelisted).
  - Không trả mật khẩu/secret trong response (ẩn field ở schema/serializer).
- Xử lý lỗi:
  - Duplicate key -> `ConflictException`
  - Not found -> `NotFoundException`
  - Validate error -> trả message rõ ràng từ class-validator.
- Cấu hình:
  - `.env` + `@nestjs/config`. Biến môi trường quan trọng: `PORT`, `MONGODB_URI`.
- Kiểm thử (khuyến nghị):
  - Unit test cho service, e2e test cho route chính.

### Mẫu thư mục cho 1 feature backend
```
src/users/
├─ dto/
│  ├─ create-user.dto.ts
│  └─ update-user.dto.ts
├─ schemas/
│  └─ user.schema.ts
├─ users.controller.ts
├─ users.service.ts
└─ users.module.ts
```

## 3) Frontend (Angular Standalone) – cấu trúc & quy ước

- Tổ chức theo feature: `src/app/features/<feature>`.
- Mỗi feature gồm:
  - `pages/`: các trang route (standalone component) – ví dụ `user-list`, `user-form`
  - `components/`: component con tái sử dụng (không trực tiếp gắn route)
  - `services/`: gọi API (HttpClient), chỉ xử lý dữ liệu & lỗi cơ bản
  - `models/`: types/interfaces, constants (enum/label)
- Routing:
  - Khai báo trong `app.routes.ts`. Mỗi page là standalone component, import trực tiếp.
- Form:
  - Sử dụng Reactive Forms, validators ở UI phù hợp DTO backend.
- UI:
  - Angular Material; tách layout (toolbar, sidenav) và nội dung.
- Environments:
  - `environment.ts` + `environment.development.ts` chứa `apiBaseUrl`.

### Mẫu thư mục cho 1 feature frontend
```
src/app/features/users/
├─ pages/
│  ├─ user-list/
│  │  ├─ user-list.ts
│  │  ├─ user-list.html
│  │  └─ user-list.scss
│  └─ user-form/
│     ├─ user-form.ts
│     ├─ user-form.html
│     └─ user-form.scss
├─ components/      # (tùy chọn)
├─ services/
│  └─ user.ts       # UserService (HttpClient)
└─ models/
   └─ user.model.ts
```

## 4) Quy trình tạo chức năng mới (step-by-step)

1) Backend (NestJS):
   - Tạo module: `nest g module <feature>`
   - Tạo controller/service: `nest g controller <feature> --no-spec`; `nest g service <feature> --no-spec`
   - Tạo DTO + schema/entity, đăng ký model trong module
   - Ánh xạ route REST trong controller; xử lý nghiệp vụ ở service
   - Thêm validate, ẩn trường nhạy cảm, xử lý lỗi phù hợp
   - (Tùy chọn) Viết e2e test chính

2) Frontend (Angular):
   - Tạo folder feature và các page standalone: `ng g component features/<feature>/pages/<page> --standalone --skip-tests`
   - Tạo service gọi API, models phù hợp DTO backend
   - Cập nhật `app.routes.ts` cho route mới
   - Dựng UI + Reactive Forms + Material; xử lý state local

3) Tài liệu & tiện ích:
   - Cập nhật `README.md` (endpoint mới, hướng dẫn sử dụng)
   - Thêm tasks VS Code nếu cần

## 5) Quy ước đặt tên
- Feature: số nhiều (users, families, events)
- Component page: `<feature>-<action>` (user-list, user-form)
- Service: `<Feature>Service` (UserService)
- DTO: `CreateXDto`, `UpdateXDto`, `QueryXDto`
- Mongoose schema/entity class: số ít (User), collection/table: số nhiều (users)

## 6) Checklist chấp nhận (Definition of Done)
- [ ] Backend: CRUD đầy đủ, validate, lỗi rõ ràng, ẩn dữ liệu nhạy cảm
- [ ] Backend: Kết nối DB qua env, không hardcode secrets
- [ ] Frontend: Pages + Service + Models đồng bộ với backend
- [ ] Frontend: UI Material gọn, responsive cơ bản, trạng thái rỗng/loading
- [ ] Docs: README cập nhật endpoint và cách chạy
- [ ] Tasks: có task dev chạy song song server/web

## 7) Ví dụ đặt tên nhanh (Users)
- Backend: `users.controller.ts`, `users.service.ts`, `dto/create-user.dto.ts`, `schemas/user.schema.ts`
- Frontend: `user-list/`, `user-form/`, `services/user.ts`, `models/user.model.ts`

---
Tài liệu này tập trung vào cấu trúc và quy ước. Khi thêm công nghệ mới (state management, i18n, testing nâng cao), hãy mở rộng các mục tương ứng theo cùng cách tổ chức.