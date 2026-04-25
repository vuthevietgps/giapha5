# Hướng dẫn tổ chức automation trong `server/test`

Tài liệu này quy định cách sắp xếp test automation API/e2e cho backend NestJS.

## 1. Hiện trạng

- Hiện mới có `app.e2e-spec.ts`
- Chưa có cấu trúc module-based cho regression API
- Script đang dùng:
  - `npm run test`
  - `npm run test:e2e`

## 2. Cấu trúc thư mục khuyến nghị

```text
server/test/
  helpers/
    app.helper.ts
    auth.helper.ts
    db.helper.ts
    fixture.helper.ts
  fixtures/
    users.fixture.ts
    families.fixture.ts
    members.fixture.ts
    subscriptions.fixture.ts
  smoke/
    auth.smoke.e2e-spec.ts
    members.smoke.e2e-spec.ts
  auth/
    auth.login.e2e-spec.ts
    auth.register.e2e-spec.ts
    auth.password.e2e-spec.ts
  users/
    users.crud.e2e-spec.ts
  families/
    families.crud.e2e-spec.ts
    families.public-share.e2e-spec.ts
  members/
    members.crud.e2e-spec.ts
    members.tree.e2e-spec.ts
    members.relationships.e2e-spec.ts
    members.photo-upload.e2e-spec.ts
  unions/
    unions.crud.e2e-spec.ts
  posts/
    posts.crud.e2e-spec.ts
  backgrounds/
    backgrounds.crud.e2e-spec.ts
  audit/
    audit.list.e2e-spec.ts
  subscriptions/
    subscriptions.query.e2e-spec.ts
    subscriptions.upgrade.e2e-spec.ts
  payments/
    payments.create.e2e-spec.ts
    payments.status.e2e-spec.ts
    payments.vnpay.e2e-spec.ts
```

## 3. Quy ước đặt tên

### File spec

- Mẫu chuẩn: `<module>.<feature>.e2e-spec.ts`
- Ví dụ:
  - `auth.login.e2e-spec.ts`
  - `families.public-share.e2e-spec.ts`
  - `members.relationships.e2e-spec.ts`

### Tên `describe`

- Mẫu chuẩn: `"[API][<module>] <feature>"`
- Ví dụ:
  - `[API][auth] login`
  - `[API][members] relationship rules`

### Tên `it`

- Mẫu chuẩn: `should <expected behavior> when <condition>`
- Ví dụ:
  - `should return 401 when password is invalid`
  - `should block member creation when plan limit is reached`

### Test data alias

- User/token:
  - `directorToken`
  - `managerToken`
  - `staffToken`
  - `headToken`
- Family/member:
  - `familyAId`
  - `familyBId`
  - `rootMemberId`
  - `childMemberId`

## 4. Quy tắc tổ chức

- Mỗi file chỉ tập trung vào một feature hoặc một nhóm behavior gần nhau.
- Không nhồi toàn bộ CRUD của nhiều module vào một spec lớn.
- Dùng `helpers/` cho bootstrap app, login, cleanup DB, seed fixture.
- Dùng `fixtures/` cho dữ liệu dùng lại; tránh hard-code rải rác trong từng spec.
- Tách `smoke/` khỏi `regression` theo thư mục để CI có thể chọn nhanh.

## 5. Chiến lược automation

- Ưu tiên tự động hóa trước cho case `P0`:
  - auth
  - family public share
  - members CRUD/tree/relationship rules
  - subscriptions/payments
- Mock hoặc stub dịch vụ ngoài nếu có thể:
  - mail
  - VNPay
- Với DB test, ưu tiên seed dữ liệu tối thiểu cho từng suite thay vì dùng chung một dataset lớn.
- Sau mỗi suite cần cleanup để tránh phụ thuộc thứ tự chạy.

## 6. Mức test nên có

- `smoke`: xác nhận API còn sống và flow chính chạy được
- `regression`: bao phủ happy path + negative path + permission path
- `contract`: nếu sau này bổ sung, dùng để khóa format response của endpoint quan trọng

## 7. Gợi ý triển khai thực tế

- Tạo `app.helper.ts` để bootstrap `INestApplication`
- Tạo `auth.helper.ts` để login và lấy token theo role
- Tạo `fixture.helper.ts` để seed nhanh family/member/subscription
- Tạo helper assert response chung cho `400/401/403/404/409`

## 8. Không nên làm

- Không đặt tên file kiểu chung chung như `test1.e2e-spec.ts`
- Không để nhiều `it` phụ thuộc dữ liệu do `it` trước tạo ra mà không seed rõ ràng
- Không gọi dịch vụ ngoài thật trong CI nếu có thể mock
- Không viết testcase quá dài, khó xác định nguyên nhân fail
