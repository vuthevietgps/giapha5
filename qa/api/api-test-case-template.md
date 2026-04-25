# Mẫu Test Case Chi Tiết

## 1. Template chuẩn

| Trường | Nội dung cần điền |
| --- | --- |
| Test Case ID | Ví dụ: `AUTH-LOGIN-001` |
| Module | Auth / Members / Payments... |
| Mục tiêu | Xác nhận hành vi cần test |
| Ưu tiên | P0 / P1 / P2 |
| Preconditions | Dữ liệu và trạng thái cần có trước khi chạy |
| Test Data | Input chính |
| Bước thực hiện | Các bước test tuần tự |
| Kết quả mong đợi | Status code, response body, side effect |
| Hậu điều kiện | Dữ liệu cần rollback hoặc giữ lại |
| Ghi chú | Liên kết bug, API docs, log... |

## 2. Case mẫu dùng ngay

### AUTH-LOGIN-001

- Module: Auth
- Mục tiêu: Đăng nhập thành công với tài khoản hợp lệ
- Ưu tiên: P0
- Preconditions:
  - Có user đã tồn tại
  - User có email đã chuẩn hóa lowercase
  - Biết password plaintext đúng
- Test Data:
  - `email = qa.truongho@example.com`
  - `password = 123456`
- Bước thực hiện:
  1. Gửi `POST /api/auth/login`
  2. Body:

```json
{
  "email": "qa.truongho@example.com",
  "password": "123456"
}
```

  3. Kiểm tra response
- Kết quả mong đợi:
  - HTTP `200`
  - Body có `accessToken`, `refreshToken`
  - Body có `user.id`, `user.email`, `user.role`
  - Không trả `password`
- Hậu điều kiện:
  - Refresh token của user được cập nhật lại trong DB

### FAMILY-SHARE-001

- Module: Families
- Mục tiêu: Bật public share cho family thành công
- Ưu tiên: P0
- Preconditions:
  - Có `familyId` hợp lệ
  - User hiện tại có quyền update family đó
  - Family đang ở trạng thái `isPublic = false`
- Test Data:
  - `familyId = <family-id>`
  - Bearer token của `GIAM_DOC` hoặc user có quyền
- Bước thực hiện:
  1. Gửi `POST /api/families/{familyId}/toggle-share`
  2. Gắn header `Authorization: Bearer <token>`
- Kết quả mong đợi:
  - HTTP `201` hoặc `200` tùy Nest mapping thực tế
  - Body có `isPublic = true`
  - Body có `shareToken` khác rỗng
  - Gọi tiếp `GET /api/families/public/{shareToken}` trả thông tin family
- Hậu điều kiện:
  - Family chuyển sang public cho đến khi gọi toggle lần nữa

### MEMBER-CREATE-PLIMIT-001

- Module: Members
- Mục tiêu: Chặn tạo member khi family đã đạt giới hạn gói
- Ưu tiên: P0
- Preconditions:
  - Family đang có subscription `ACTIVE`
  - Số member hiện tại bằng `maxMembers`
  - User có quyền tạo member trong family
- Test Data:

```json
{
  "fullName": "Nguyen Van Test Limit",
  "family": "<family-id>",
  "gender": "male"
}
```

- Bước thực hiện:
  1. Gửi `POST /api/members`
  2. Header có bearer token hợp lệ
- Kết quả mong đợi:
  - HTTP `403`
  - Message nêu đã đạt giới hạn thành viên của gói hiện tại
  - Không tạo thêm member trong DB

### MEMBER-UPDATE-CYCLE-001

- Module: Members
- Mục tiêu: Chặn update tạo vòng lặp cha/mẹ
- Ưu tiên: P0
- Preconditions:
  - Có member A là cha của member B
  - User có quyền update
- Test Data:
  - Update member A với `father = B`
- Bước thực hiện:
  1. Gửi `PUT /api/members/{memberAId}`
  2. Body:

```json
{
  "father": "<member-b-id>"
}
```

- Kết quả mong đợi:
  - HTTP `400`
  - Message báo thiết lập bố tạo vòng lặp
  - Quan hệ cha/con cũ không thay đổi

### PAYMENT-CREATE-BANK-001

- Module: Payments
- Mục tiêu: Tạo payment bằng chuyển khoản thành công
- Ưu tiên: P0
- Preconditions:
  - Có plan trả phí hợp lệ, ví dụ `basic`
  - User có quyền trên `familyId`
- Test Data:

```json
{
  "planSlug": "basic",
  "familyId": "<family-id>",
  "method": "bank_transfer"
}
```

- Bước thực hiện:
  1. Gửi `POST /api/payments/create`
  2. Header có bearer token hợp lệ
- Kết quả mong đợi:
  - HTTP `200`
  - Body có `method = bank_transfer`
  - Body có `paymentId`, `subscriptionId`
  - Body có `bankInfo.bankName`, `accountNumber`, `amount`, `content`, `qrData`
  - DB có payment trạng thái `PENDING`
  - DB có subscription trạng thái `PENDING_PAYMENT`

### MEMBER-RELATION-UNION-001

- Module: Members / Unions
- Mục tiêu: Chặn tạo member khi có cả cha và mẹ nhưng cha mẹ chưa thuộc cùng một union
- Ưu tiên: P0
- Preconditions:
  - Có `familyId` hợp lệ
  - Có `fatherId` và `motherId` cùng family
  - Chưa tồn tại union chứa cả `fatherId` và `motherId`
  - User có quyền create member trong family
- Test Data:

```json
{
  "fullName": "Child Without Union",
  "family": "<family-id>",
  "father": "<father-id>",
  "mother": "<mother-id>",
  "gender": "male"
}
```

- Bước thực hiện:
  1. Gửi `POST /api/members`
  2. Header có bearer token hợp lệ
- Kết quả mong đợi:
  - HTTP `400`
  - Message nêu rõ cha và mẹ phải thuộc cùng một union
  - Không tạo member mới trong DB

### PAYMENT-CONFIRM-IDEMP-001

- Module: Payments / Subscriptions
- Mục tiêu: Xác nhận confirm payment không gây kích hoạt lặp khi gọi lại cùng `paymentId`
- Ưu tiên: P0
- Preconditions:
  - Có 1 payment `PENDING`
  - Payment gắn với 1 subscription đang chờ thanh toán
  - User có quyền confirm payment theo nghiệp vụ hiện tại
- Test Data:

```json
{
  "paymentId": "<payment-id>"
}
```

- Bước thực hiện:
  1. Gửi `POST /api/payments/confirm` lần 1
  2. Kiểm tra payment và subscription sau lần 1
  3. Gửi lại `POST /api/payments/confirm` lần 2 với cùng `paymentId`
  4. Kiểm tra payment và subscription sau lần 2
- Kết quả mong đợi:
  - Lần 1: payment chuyển `SUCCESS`, subscription được activate đúng 1 lần
  - Lần 2: không tạo side effect lặp, không kéo dài hạn vô lý, không sinh thêm payment/subscription mới
  - API trả trạng thái nhất quán, dễ hiểu cho QA/dev

## 3. Ghi chú khi viết testcase

- Luôn ghi rõ role đang dùng để chạy case.
- Với endpoint có side effect DB, thêm bước verify DB hoặc verify qua API đọc lại.
- Với endpoint upload file, lưu rõ file mẫu: tên file, dung lượng, mime type.
- Với endpoint public, chạy thêm case không gắn token để phân biệt public/private.
