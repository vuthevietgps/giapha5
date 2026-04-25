# Mẫu Test Case Chi Tiết

## 1. Template chuẩn

### Header

- Mã test case:
- Tên test case:
- Feature/Page:
- Mức ưu tiên:
- Loại test: manual / integration / e2e
- Tiền điều kiện:
- Dữ liệu test:

### Các bước

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 |  |  |
| 2 |  |  |

### Kết quả

- Pass/Fail:
- Ghi chú:
- Defect ID liên quan:

## 2. Mẫu chi tiết tham chiếu

### FE-AUTH-LOGIN-001

- Tên test case: Đăng nhập thành công với tài khoản hợp lệ
- Feature/Page: Login
- Mức ưu tiên: P0
- Loại test: manual + integration + e2e
- Tiền điều kiện:
  - Có tài khoản hợp lệ
  - User đang logout
- Dữ liệu test:
  - Email hợp lệ
  - Password hợp lệ

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Mở `/login` | Form login hiển thị đầy đủ email, password, CTA submit |
| 2 | Nhập email và password hợp lệ | Dữ liệu nhập được giữ đúng trong field |
| 3 | Bấm `Đăng nhập` | Nút vào trạng thái loading, không submit lặp |
| 4 | Chờ phản hồi thành công | User được chuyển sang `/dashboard` |
| 5 | Refresh trang | Phiên đăng nhập vẫn còn hiệu lực |

### FE-AUTH-REGISTER-002

- Tên test case: Chặn đăng ký khi xác nhận mật khẩu không khớp
- Feature/Page: Register
- Mức ưu tiên: P0
- Loại test: manual + integration
- Tiền điều kiện:
  - User chưa đăng nhập
- Dữ liệu test:
  - `password = 123456`
  - `confirmPassword = 1234567`

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Mở `/register` | Form đăng ký hiển thị nhóm thông tin cá nhân và dòng họ |
| 2 | Nhập đầy đủ các field bắt buộc, nhưng confirm password khác password | Form chấp nhận nhập dữ liệu |
| 3 | Bấm submit | Không gọi đăng ký thành công |
| 4 | Quan sát banner lỗi | Hiển thị thông báo `Mật khẩu nhập lại không khớp` |
| 5 | Kiểm tra route hiện tại | Vẫn ở `/register` |

### FE-GUARD-ROUTE-001

- Tên test case: Route protected chuyển hướng về login khi chưa xác thực
- Feature/Page: Auth guard
- Mức ưu tiên: P0
- Loại test: integration + e2e
- Tiền điều kiện:
  - Không có `accessToken`
  - Không có `currentUser` trong localStorage
- Dữ liệu test:
  - URL đích: `/members`

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Truy cập trực tiếp `/members` | App không hiển thị member list |
| 2 | Chờ router xử lý | URL đổi sang `/login` |
| 3 | Quan sát giao diện | Trang login hiển thị bình thường, không loop redirect |

### FE-MEMBER-FORM-003

- Tên test case: Tạo thành viên mới với family hợp lệ và quan hệ thân thuộc
- Feature/Page: Member form
- Mức ưu tiên: P0
- Loại test: manual + integration + e2e
- Tiền điều kiện:
  - Đã đăng nhập
  - Có sẵn 1 family
  - Có sẵn ít nhất 1 father và 1 mother candidate trong family đó
- Dữ liệu test:
  - Full name hợp lệ
  - Family hợp lệ
  - Gender, father, mother, spouse, children tùy kịch bản

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Mở `/members/new` | Form hiển thị đầy đủ field |
| 2 | Chọn family | Các select father/mother/spouse được enable |
| 3 | Chọn gender, father, mother, spouse, nhập các field bắt buộc | Option hiển thị đúng theo family hiện tại |
| 4 | Bấm save | Gọi create member |
| 5 | Nếu có ảnh, upload ảnh sau save | Upload hoàn tất và hiển thị snackbar thành công |
| 6 | Chờ điều hướng | Quay về `/members` |

### FE-TREE-EXPORT-001

- Tên test case: Export cây gia phả PNG từ tree page
- Feature/Page: Member Tree
- Mức ưu tiên: P0
- Loại test: manual + selective integration
- Tiền điều kiện:
  - Đã đăng nhập
  - Có family với dữ liệu cây hiển thị được
- Dữ liệu test:
  - Family có root member và ít nhất 2 thế hệ

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Mở `/members/tree` | Cây tải thành công, không có error banner |
| 2 | Chọn family có dữ liệu | Root, spouse và level hiển thị |
| 3 | Thực hiện zoom/pan nếu cần | Cây phản hồi thao tác, không crash |
| 4 | Bấm export PNG | Bắt đầu tiến trình export |
| 5 | Chờ kết quả | Không có lỗi runtime, file PNG được tạo hoặc tiến trình hoàn tất thành công |

### FE-PAYMENT-BANK-001

- Tên test case: Tạo thanh toán chuyển khoản và kiểm tra trạng thái
- Feature/Page: Payment
- Mức ưu tiên: P0
- Loại test: integration + e2e
- Tiền điều kiện:
  - Đã đăng nhập
  - Có family hợp lệ
  - Có plan paid hợp lệ
- Dữ liệu test:
  - Query `plan`
  - Query `family`
  - Phương thức `bank_transfer`

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Mở `/payment?plan=<slug>&family=<id>` | Trang tải plan thành công |
| 2 | Chọn `Chuyển khoản ngân hàng` | Radio được chọn |
| 3 | Bấm `Tiếp tục thanh toán` | Nút vào loading, request create payment được gửi |
| 4 | Nhận phản hồi thành công | Hiển thị bước bank transfer với QR, ngân hàng, STK, số tiền, nội dung CK |
| 5 | Bấm kiểm tra trạng thái | Nếu backend trả `SUCCESS`, UI đổi sang `Thanh toán đã được xác nhận` |

### FE-PUBLIC-TREE-001

- Tên test case: Public tree hiển thị đúng với token hợp lệ
- Feature/Page: Public tree
- Mức ưu tiên: P0
- Loại test: manual + integration + e2e
- Tiền điều kiện:
  - Có token chia sẻ công khai hợp lệ
- Dữ liệu test:
  - `token` hợp lệ

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Mở `/share/<token>` | Hiển thị loading state |
| 2 | Chờ API family và members trả về | Hero section hiển thị tên family, contactName, address nếu có |
| 3 | Quan sát phần cây | Founder, spouse, generation sections hiển thị đúng |
| 4 | Thu nhỏ viewport về mobile | Card và footer không vỡ layout |

### FE-PRINT-001

- Tên test case: Print page khôi phục asset theo family và export poster
- Feature/Page: Print
- Mức ưu tiên: P0
- Loại test: manual
- Tiền điều kiện:
  - Đã đăng nhập
  - Có family
  - Đã có background/tree asset hoặc có file để tải lên
- Dữ liệu test:
  - 1 background
  - 1 SVG tree hoặc tree image

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Mở `/print` | Page tải được families |
| 2 | Chọn family | Background choice và tree asset tương ứng được nạp |
| 3 | Tải lên hoặc chọn decor / tree SVG | Preview cập nhật |
| 4 | Kéo thả một vài layer | Vị trí thay đổi đúng theo thao tác |
| 5 | Bấm export poster | Quá trình export hoàn tất, không có lỗi runtime |

### FE-TREE-FOCUS-002

- Tên test case: Focus vào nhánh có member nữ làm gốc không làm sai thao tác spouse/add child
- Feature/Page: Member Tree
- Mức ưu tiên: P0
- Loại test: manual + E2E
- Tiền điều kiện:
  - Đã đăng nhập
  - Có family với ít nhất 1 member nữ có chồng và có con
- Dữ liệu test:
  - `focus=<member-nu-id>`
  - `spouses=1`

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Mở `/members/tree?focus=<member-nu-id>&spouses=1` | Tree mở đúng nhánh được focus |
| 2 | Quan sát khu vực root/focus | Spouse được hiển thị đúng vai trò, không bị gắn nhãn sai giới tính/ngữ cảnh |
| 3 | Bấm thao tác thêm con từ anchor của spouse | Dialog/flow thêm con hoạt động đúng, không bị no-op |
| 4 | Hoàn tất tạo con | Tree reload đúng, con mới xuất hiện đúng nhánh |

### FE-PUBLIC-TOKEN-002

- Tên test case: Public tree hiển thị lỗi rõ ràng khi token đã bị thu hồi
- Feature/Page: Public tree
- Mức ưu tiên: P0
- Loại test: manual + integration + E2E
- Tiền điều kiện:
  - Có token share từng hợp lệ nhưng hiện tại family đã tắt share
- Dữ liệu test:
  - `token` đã bị revoke

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Mở `/share/<revoked-token>` | Hiển thị loading state ngắn |
| 2 | Chờ phản hồi API | Không render tree |
| 3 | Quan sát màn hình | Hiển thị error state rõ ràng, có CTA quay về trang chủ |

### FE-PAYMENT-CALLBACK-002

- Tên test case: Payment callback reload lại trang vẫn giữ đúng trạng thái xác nhận
- Feature/Page: Payment callback
- Mức ưu tiên: P0
- Loại test: integration + E2E
- Tiền điều kiện:
  - Có callback URL thành công hoặc verify success fallback
- Dữ liệu test:
  - Query params callback hợp lệ

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Mở `/payment/callback?...` với dữ liệu thành công | Trang hiển thị trạng thái thành công |
| 2 | Refresh trình duyệt | Trang không rơi về trạng thái lỗi giả |
| 3 | Quan sát CTA | CTA điều hướng tiếp theo vẫn đúng theo trạng thái success |
