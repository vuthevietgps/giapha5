# Kế hoạch Test API

## 1. Mục tiêu

- Xác nhận API backend hoạt động đúng nghiệp vụ chính.
- Bảo đảm các endpoint trọng yếu có kiểm soát xác thực, phân quyền, validation và toàn vẹn dữ liệu.
- Phát hiện sớm lỗi hồi quy ở các flow có rủi ro cao: đăng nhập, đăng ký, tạo/sửa member, chia sẻ public, subscription/payment.

## 2. Phạm vi

### Trong phạm vi

- `auth`
- `users`
- `families`
- `members`
- `unions`
- `posts`
- `backgrounds`
- `audit`
- `subscriptions`
- `payments`

### Ngoài phạm vi hiện tại

- Frontend/UI
- Hiệu năng tải lớn và stress test
- Bảo mật chuyên sâu mức pentest
- Module không được yêu cầu trong đợt này như `positions`

## 3. Cơ sở kỹ thuật đã xác nhận

- API prefix: `/api`
- NestJS dùng `ValidationPipe` global:
  - tự loại field ngoài DTO
  - chặn field không được phép
  - transform kiểu dữ liệu đầu vào
- Phân quyền qua `PermissionsGuard`
- Middleware auth áp dụng toàn cục, endpoint public chỉ là các route không gắn guard
- Tạo member mới có chặn giới hạn gói qua `PlanLimitInterceptor`

## 4. Chiến lược kiểm thử

### Smoke

- Kiểm tra nhanh các flow sống còn:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `GET /api/auth/me`
  - CRUD cơ bản `families`, `members`
  - `GET /api/subscriptions/plans`
  - `POST /api/payments/create`

### Functional

- Happy path cho từng module
- Negative path:
  - thiếu field bắt buộc
  - sai định dạng email/phone/date/mongo id
  - token sai/hết hạn
  - file sai mime type hoặc quá size

### Authorization

- Kiểm tra 4 role:
  - `GIAM_DOC`
  - `QUAN_LY`
  - `NHAN_VIEN`
  - `TRUONG_HO`
- Kiểm tra chéo quyền theo family:
  - đúng family được quản lý
  - family ngoài phạm vi
  - tài nguyên không có quyền nhưng bị trả `404` theo service logic

### Data integrity

- Tạo/xóa member không làm gãy liên kết cây
- Rule root male duy nhất trong một family
- Rule tránh cycle cha/mẹ/con
- Rule father + mother phải thuộc cùng `union`
- Xóa family phải cascade member/union
- Xóa member phải dọn quan hệ và union liên quan

### Integration

- `auth.register` tạo `family`, `user`, `free subscription`
- `payments` liên kết `subscription`, `payment`, email confirm
- `families public share` liên kết `family` và public member list

## 5. Môi trường và dữ liệu test

## Môi trường khuyến nghị

- 1 môi trường QA riêng, DB riêng
- Dùng sandbox cho VNPay nếu kiểm tra callback
- Mail service dùng inbox test/mock nếu có thể

## Dữ liệu test tối thiểu

- 1 user `GIAM_DOC`
- 1 user `QUAN_LY` quản lý `Family A`
- 1 user `NHAN_VIEN` gắn `Family A`
- 1 user `TRUONG_HO` gắn `Family A`
- 1 family ngoài phạm vi của `QUAN_LY/NHAN_VIEN/TRUONG_HO` để test access deny
- Bộ member mẫu gồm:
  - 1 root male
  - 1 spouse female
  - 2 children
  - 1 union hợp lệ
- 1 plan trả phí đang active trong bảng plan

## 6. Ưu tiên thực thi

### P0

- Auth login/register/refresh/me/reset password
- Authorization theo role
- Family public sharing
- Member create/update/delete/tree/reparent
- Payment create/status/confirm/vnpay verify
- Subscription plans/my/family/upgrade

### P1

- Users CRUD
- Unions CRUD/normalize
- Background upload/list/file/delete
- Posts CRUD
- Audit list

### P2

- Message lỗi chi tiết
- Dữ liệu biên dài/ngắn
- Trường hợp đồng thời hoặc lặp thao tác

## 7. Tiêu chí vào/ra

## Entry criteria

- API deploy thành công
- DB kết nối được
- Có user/token test cho 4 role
- Có plan/subscription seed tối thiểu

## Exit criteria

- 100% testcase `P0` đã chạy
- Không còn defect `Critical` hoặc `High` chưa có phương án xử lý
- Defect `Medium/Low` đã được ghi nhận và thống nhất mức chấp nhận rủi ro

## 8. Rủi ro cần theo dõi

- Auth middleware chạy toàn cục có thể ảnh hưởng endpoint public nếu cấu hình thay đổi
- Module payment/email phụ thuộc dịch vụ ngoài
- Nhiều service trả `404` thay vì `403` để che giấu tài nguyên; QA cần so với thiết kế thực tế
- `POST /api/payments/confirm` hiện không nhận `@CurrentUser()`, cần test kỹ vì guard vẫn đang áp dụng metadata quyền
