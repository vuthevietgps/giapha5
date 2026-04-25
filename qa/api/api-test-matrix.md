# Test Matrix Và Module Checklist

## Quy ước

- `P0`: bắt buộc trước release
- `P1`: nên hoàn tất trong regression chính
- `P2`: bổ sung khi có thời gian

## 1. Auth

| API/Flow | Mức ưu tiên | Kiểm thử chính |
| --- | --- | --- |
| `POST /api/auth/login` | P0 | đúng email/password, sai password, email không tồn tại, email viết hoa/thừa space, thiếu field |
| `POST /api/auth/register` | P0 | tạo user + family + free subscription, email trùng, password < 6, thiếu `familyName`, field thừa |
| `POST /api/auth/verify-email` | P0 | token hợp lệ, token thiếu, token sai, token hết hạn |
| `POST /api/auth/forgot-password` | P0 | email tồn tại, email không tồn tại nhưng vẫn trả message chung |
| `POST /api/auth/reset-password` | P0 | token hợp lệ, token sai/hết hạn, password mới < 6 |
| `POST /api/auth/refresh` | P0 | refresh hợp lệ, refresh sai chữ ký, refresh cũ sau khi login lại |
| `GET /api/auth/me` | P0 | có token hợp lệ, thiếu token, token hết hạn |

Checklist:

- [ ] Login trả `accessToken`, `refreshToken`, `user`
- [ ] Register auto gán role `TRUONG_HO`
- [ ] Register tạo `assignedFamily`
- [ ] Forgot password không lộ việc email có tồn tại hay không
- [ ] Refresh token cũ không dùng lại được sau khi refresh thành công

## 2. Users

| API/Flow | Mức ưu tiên | Kiểm thử chính |
| --- | --- | --- |
| `POST /api/users` | P1 | tạo user đúng role, role vượt quyền, email trùng, password min length |
| `GET /api/users` | P1 | lọc danh sách theo quyền từng role |
| `GET /api/users/:id` | P1 | xem user đúng phạm vi, ngoài phạm vi trả not found |
| `PATCH /api/users/:id` | P1 | update role/family, email trùng, đổi password |
| `DELETE /api/users/:id` | P1 | xóa user khác, chặn xóa chính mình, chặn xóa user vượt quyền |

Checklist:

- [ ] `GIAM_DOC` CRUD toàn bộ user
- [ ] `QUAN_LY` chỉ quản lý `NHAN_VIEN` và `TRUONG_HO`
- [ ] `NHAN_VIEN` và `TRUONG_HO` không có quyền module `users`
- [ ] Password được hash sau create/update

## 3. Families

| API/Flow | Mức ưu tiên | Kiểm thử chính |
| --- | --- | --- |
| `GET /api/families/public/:token` | P0 | token hợp lệ, token sai, token đã tắt share |
| `GET /api/families/public/:token/members` | P0 | chỉ trả field public của member |
| `POST /api/families` | P0 | tạo family, phone sai định dạng, `rootMember` sai/sai family/sai gender |
| `GET /api/families` | P0 | danh sách theo quyền từng role |
| `GET /api/families/:id` | P0 | truy cập đúng family, ngoài quyền |
| `POST /api/families/:id/toggle-share` | P0 | bật share sinh token, tắt share xóa token |
| `PATCH /api/families/:id` | P0 | cập nhật hợp lệ, rootMember không thuộc family |
| `DELETE /api/families/:id` | P0 | xóa family có cascade member/union |

Checklist:

- [ ] Public token chỉ dùng khi `isPublic = true`
- [ ] `rootMember` phải là nam
- [ ] `rootMember` khi update phải thuộc đúng family
- [ ] Sau khi delete family, dữ liệu member/union liên quan bị dọn

## 4. Members

| API/Flow | Mức ưu tiên | Kiểm thử chính |
| --- | --- | --- |
| `GET /api/members` | P0 | lọc theo `family`, tìm kiếm `q`, trả rỗng khi ngoài phạm vi |
| `GET /api/members/by-family/:familyId` | P0 | đúng family, sai family |
| `GET /api/members/tree` | P0 | tree đủ node, root cụ thể, family ngoài quyền |
| `GET /api/members/:id` | P0 | id hợp lệ, id không tồn tại |
| `POST /api/members` | P0 | create hợp lệ, family không tồn tại, email trùng, vượt limit plan |
| `PUT /api/members/:id` | P0 | update quan hệ, đổi family, spouse symmetry |
| `PUT /api/members/:id/children` | P0 | set children đúng gender parent, chặn self/cycle |
| `PUT /api/members/:id/reparent` | P0 | reparent theo union, chặn self/cycle |
| `DELETE /api/members/:id` | P0 | xóa member và dọn father/mother/spouse/union |
| `PUT /api/members/:id/photo` | P1 | upload ảnh đúng loại, sai mime type, quá 5MB, thiếu file |

Checklist:

- [ ] Chỉ một root male không có cha/mẹ/spouse trong cùng family
- [ ] Nếu có cả `father` và `mother`, phải có union tương ứng
- [ ] `father`, `mother`, `spouse` phải cùng family
- [ ] Không cho `father/mother/spouse` là chính member
- [ ] Không tạo vòng lặp gia phả
- [ ] Xóa member phải dọn union còn < 2 partners

## 5. Unions

| API/Flow | Mức ưu tiên | Kiểm thử chính |
| --- | --- | --- |
| `POST /api/unions` | P1 | create hợp lệ, partners rỗng, family sai |
| `GET /api/unions` | P1 | lọc theo `family`, `partner` |
| `GET /api/unions/:id` | P1 | truy cập đúng family, ngoài quyền |
| `PATCH /api/unions/:id` | P1 | update partner/date/note |
| `DELETE /api/unions/:id` | P1 | xóa hợp lệ |
| `POST /api/unions/normalize/:memberId` | P1 | chuẩn hóa union cho member |

Checklist:

- [ ] `partners` tối thiểu 1 phần tử theo DTO
- [ ] Union phải thuộc family mà user có quyền
- [ ] Sau khi xóa member, union liên quan phải được làm sạch

## 6. Posts

| API/Flow | Mức ưu tiên | Kiểm thử chính |
| --- | --- | --- |
| `POST /api/posts` | P1 | tạo post hợp lệ, thiếu `title/content`, role không đủ quyền |
| `GET /api/posts` | P1 | danh sách theo quyền |
| `GET /api/posts/:id` | P1 | xem chi tiết hợp lệ |
| `PATCH /api/posts/:id` | P1 | cập nhật hợp lệ, role không đủ quyền |
| `DELETE /api/posts/:id` | P1 | xóa hợp lệ, role không đủ quyền |

Checklist:

- [ ] `GIAM_DOC`, `QUAN_LY` có đủ CRUD
- [ ] `NHAN_VIEN`, `TRUONG_HO` chỉ đọc
- [ ] Validation chặn thiếu `title/content`

## 7. Backgrounds

| API/Flow | Mức ưu tiên | Kiểm thử chính |
| --- | --- | --- |
| `POST /api/backgrounds` | P1 | upload file hợp lệ, sai mime, quá 10MB, family ngoài quyền |
| `GET /api/backgrounds` | P1 | list theo family, theo quyền |
| `GET /api/backgrounds/:id/file` | P1 | tải file hợp lệ, file vật lý bị thiếu |
| `DELETE /api/backgrounds/:id` | P1 | xóa hợp lệ, role không đủ quyền |

Checklist:

- [ ] Chấp nhận `jpeg/png/gif/webp/svg`
- [ ] Trả `404` nếu file vật lý không còn trên disk
- [ ] `NHAN_VIEN` chỉ read/create, không delete

## 8. Audit

| API/Flow | Mức ưu tiên | Kiểm thử chính |
| --- | --- | --- |
| `GET /api/audit` | P1 | list toàn bộ/theo `entity`/`entityId`/`limit`, role không đủ quyền |

Checklist:

- [ ] Có log sau create/update/delete/reparent member
- [ ] Kiểm tra filter `entity`, `entityId`, `limit`
- [ ] Chỉ role có quyền `users.read` mới dùng được endpoint này

## 9. Subscriptions

| API/Flow | Mức ưu tiên | Kiểm thử chính |
| --- | --- | --- |
| `GET /api/subscriptions/plans` | P0 | trả plan active, sắp theo `sortOrder` |
| `GET /api/subscriptions/my` | P0 | chỉ subscription của user hiện tại |
| `GET /api/subscriptions/family/:familyId` | P0 | đúng family, family ngoài quyền |
| `GET /api/subscriptions/payments` | P0 | payment history của user |
| `POST /api/subscriptions/upgrade/:planSlug?familyId=` | P0 | plan hợp lệ, family hợp lệ, plan không tồn tại |

Checklist:

- [ ] Register sinh free subscription
- [ ] Upgrade plan free qua API trả lỗi nghiệp vụ
- [ ] Family ngoài phạm vi không upgrade được
- [ ] Payment/subscription mới ở trạng thái pending trước confirm

## 10. Payments

| API/Flow | Mức ưu tiên | Kiểm thử chính |
| --- | --- | --- |
| `POST /api/payments/create` | P0 | `vnpay`, `bank_transfer`, thiếu `familyId`, thiếu `planSlug`, method sai |
| `GET /api/payments/vnpay-return` | P0 | chữ ký hợp lệ, chữ ký sai, response code `00`, response code fail |
| `POST /api/payments/confirm` | P0 | confirm payment thủ công, payment không tồn tại |
| `GET /api/payments/status?paymentId=` | P0 | đúng owner/family, thiếu `paymentId`, payment ngoài quyền |
| `GET /api/payments/vnpay-verify` | P0 | verify thành công/thất bại |

Checklist:

- [ ] `bank_transfer` trả `bankInfo`, `content`, `qrData`
- [ ] `vnpay` chỉ trả `paymentUrl` khi cấu hình VNPay đầy đủ
- [ ] Confirm payment chuyển payment sang success và activate subscription
- [ ] Status payment che giấu payment ngoài quyền bằng not found

## 11. Tình huống chéo bắt buộc

| Scenario ID | Nhóm | Mức ưu tiên | Tình huống cần cover |
| --- | --- | --- | --- |
| `API-CROSS-001` | Auth | P0 | Gọi protected API không có token |
| `API-CROSS-002` | Auth | P0 | Gọi protected API với token sai chữ ký |
| `API-CROSS-003` | Auth | P0 | Gọi protected API với token hết hạn |
| `API-CROSS-004` | Validation | P0 | Gửi field thừa vào DTO khi `forbidNonWhitelisted = true` |
| `API-CROSS-005` | Validation | P1 | Gửi `ObjectId` sai định dạng vào path/query/body |
| `API-CROSS-006` | Permission | P0 | User đúng role nhưng sai family scope |
| `API-CROSS-007` | Permission | P0 | So sánh hành vi `404` vs `403` ở resource ngoài quyền |
| `API-CROSS-008` | Regression | P0 | Dữ liệu ref dạng `String` và `ObjectId` cùng tồn tại vẫn query đúng |
| `API-CROSS-009` | Concurrency | P1 | Double submit cùng request create/update/delete |
| `API-CROSS-010` | Data cleanup | P0 | Xóa tài nguyên cha không để lại orphan records |

Checklist:

- [ ] Endpoint public không vô tình bị chặn bởi auth middleware/guard
- [ ] Endpoint protected không vô tình mở public
- [ ] Message lỗi nhất quán giữa happy path và negative path chính
- [ ] Response không lộ field nhạy cảm như `password`, token nội bộ, path file vật lý

## 12. Tình huống chuyên sâu cho cây gia phả

| Scenario ID | API/Flow | Mức ưu tiên | Tình huống cần cover |
| --- | --- | --- | --- |
| `API-TREE-001` | `POST /api/members` | P0 | Tạo root male đầu tiên thành công |
| `API-TREE-002` | `POST /api/members` | P0 | Tạo root male thứ hai trong cùng family bị chặn |
| `API-TREE-003` | `POST /api/members` | P0 | Tạo con có cả `father` và `mother` nhưng không có `union` bị chặn |
| `API-TREE-004` | `PUT /api/members/:id` | P0 | Cập nhật `spouse` tạo quan hệ đối xứng ở cả hai member |
| `API-TREE-005` | `PUT /api/members/:id` | P0 | Bỏ `spouse` phải dọn backlink ở phía đối tác |
| `API-TREE-006` | `PUT /api/members/:id/reparent` | P0 | Reparent qua `unionId` gán đúng cha/mẹ theo gender |
| `API-TREE-007` | `PUT /api/members/:id/reparent` | P0 | Reparent gây cycle bị chặn |
| `API-TREE-008` | `PUT /api/members/:id/children` | P0 | Set children từ parent nữ phải map vào `mother` |
| `API-TREE-009` | `DELETE /api/members/:id` | P0 | Xóa member phải dọn `father/mother/spouse`, dọn union < 2 partner, clear `family.rootMember` nếu cần |
| `API-TREE-010` | `GET /api/members/tree` | P0 | Tree trả đúng roots khi có `root` query và khi không có `root` query |
| `API-TREE-011` | `POST /api/unions/normalize/:memberId` | P1 | Normalize tạo union còn thiếu từ spouse/backlink/con chung |
| `API-TREE-012` | `GET /api/families/public/:token/members` | P0 | Public members chỉ trả field được công khai, không lộ field nội bộ |

## 13. Tình huống chuyên sâu cho thanh toán và gói dịch vụ

| Scenario ID | API/Flow | Mức ưu tiên | Tình huống cần cover |
| --- | --- | --- | --- |
| `API-PAY-001` | `POST /api/payments/create` | P0 | Tạo payment cho `bank_transfer` thành công |
| `API-PAY-002` | `POST /api/payments/create` | P0 | Tạo payment cho `vnpay` thành công khi đủ config |
| `API-PAY-003` | `POST /api/payments/create` | P0 | Plan slug không tồn tại bị chặn |
| `API-PAY-004` | `POST /api/payments/create` | P0 | Family ngoài quyền bị chặn |
| `API-PAY-005` | `POST /api/payments/confirm` | P0 | Confirm lần đầu thành công, payment chuyển trạng thái đúng |
| `API-PAY-006` | `POST /api/payments/confirm` | P0 | Confirm lần hai trên cùng payment không làm double-activate subscription |
| `API-PAY-007` | `GET /api/payments/vnpay-return` | P0 | Callback chữ ký sai không đổi trạng thái payment |
| `API-PAY-008` | `GET /api/payments/vnpay-return` | P0 | Callback thất bại không activate subscription |
| `API-PAY-009` | `GET /api/payments/status` | P0 | User không sở hữu payment bị `not found` |
| `API-PAY-010` | `POST /api/members` | P0 | Khi plan đã đạt giới hạn, create member bị chặn ổn định |
