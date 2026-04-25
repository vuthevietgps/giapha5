# Kế Hoạch Test Frontend

## 1. Mục tiêu

- Bảo vệ các luồng nghiệp vụ chính của Angular app trước lỗi hồi quy.
- Đảm bảo điều hướng, phân quyền, form validation, trạng thái loading/error/empty và hành vi responsive hoạt động ổn định.
- Tạo nền tảng để chuyển từ test thủ công sang automation theo mức ưu tiên rủi ro.

## 2. Phạm vi kiểm thử

### Trong phạm vi

- Route công khai: `/`, `/home`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/share/:token`
- Route yêu cầu đăng nhập: `/dashboard`, `/plans`, `/payment`, `/users`, `/families`, `/positions`, `/members`, `/members/tree`, `/members/branch`, `/members/branch-calendar`, `/calendar`, `/posts`, `/print`
- Thành phần trọng yếu:
  - `AuthService`, `PermissionService`, `authGuard`
  - CRUD form/list cho Users, Families, Positions, Members
  - Tree page và public tree page
  - Payment flow và callback
  - Print/export flow
  - Confirm dialog, post creation dialog, snackbar feedback

### Ngoài phạm vi của bộ tài liệu này

- API contract chi tiết và backend validation chi tiết
- Hiệu năng backend, bảo mật backend, migration dữ liệu
- QA cho template/server-side ngoài frontend

## 3. Chiến lược kiểm thử

### 3.1 Theo lớp

- Smoke test:
  - App render
  - Auth guard redirect
  - Login thành công
  - Dashboard mở được sau login
- Component/unit:
  - Validation form
  - Mapping dữ liệu UI
  - Conditional rendering theo role/quyền
  - Utility logic của tree/calendar/payment callback
- Integration:
  - Page + service mock + router + Material dialog/snackbar
  - CRUD flow list -> form -> save -> navigate
  - Payment choose -> create -> bank transfer/vnpay redirect
- E2E:
  - Auth cơ bản
  - CRUD trọng yếu
  - Tree/public tree/print
  - Pricing/payment callback happy path
- Manual exploratory:
  - Drag/drop, zoom, pan, export trên tree/print
  - Responsive và accessibility

### 3.2 Theo rủi ro

- P0:
  - Login, register, route guard, logout
  - Permission-based navigation
  - Member CRUD
  - Member tree load/edit/export
  - Payment flow và callback
  - Public tree token handling
- P1:
  - Families, Users, Positions, Posts, Dashboard
  - Print page
  - Calendar/Branch/Branch Calendar
- P2:
  - Landing page contact/pricing fallback
  - Visual polish và edge case ít gặp

## 4. Danh mục chất lượng cần bảo vệ

- Tính đúng nghiệp vụ frontend
- Tính nhất quán điều hướng
- Form validation phía client
- Xử lý lỗi API và empty state
- Hiển thị đúng theo role/quyền
- Tương thích mobile/tablet/desktop
- Khả năng thao tác bàn phím và semantic cơ bản

## 5. Entry Criteria

- Frontend build được.
- Có môi trường test với API mock hoặc backend dev ổn định tối thiểu.
- Có tài khoản test theo ít nhất 4 role:
  - `GIAM_DOC`
  - `QUAN_LY`
  - `NHAN_VIEN`
  - `TRUONG_HO`
- Có dữ liệu test cho:
  - ít nhất 2 family
  - member có quan hệ cha/mẹ/vợ-chồng/con
  - plan free/basic/advanced/unlimited
  - payment thành công/thất bại

## 6. Exit Criteria

- 100% P0 manual pass trước release.
- P0 automation pass ổn định.
- Không còn defect Severity 1 hoặc Severity 2 mở trên các luồng:
  - auth
  - route guard
  - member CRUD
  - member tree
  - payment
  - public tree

## 7. Môi trường và dữ liệu test

- Viewport tối thiểu cần test:
  - Mobile: `390x844`
  - Tablet: `768x1024`
  - Desktop: `1366x768`
- Trình duyệt tối thiểu:
  - Chrome mới
  - Edge mới
- Dữ liệu tối thiểu:
  - 1 family rỗng
  - 1 family có dữ liệu dày
  - 1 public share token hợp lệ
  - 1 public share token hết hạn/không hợp lệ
  - 1 payment bank transfer đang chờ
  - 1 payment VNPay callback thành công

## 8. Rủi ro hiện hữu từ code hiện tại

- Test baseline gần như chưa có.
- Nhiều page dùng subscribe trực tiếp, dễ thiếu test cho error path.
- Tree page và print page có logic UI phức tạp, nhiều thao tác kéo/thả/zoom/export.
- Permission hiển thị menu và quản lý user phụ thuộc role; rất dễ phát sinh lỗi hồi quy khi sửa role mapping.
- Payment flow có nhiều trạng thái bất đồng bộ: tạo đơn, polling, callback, redirect.

## 9. Đề xuất rollout

- Giai đoạn 1:
  - Bổ sung unit/integration cho auth, permission, route guard, form validation
- Giai đoạn 2:
  - Bổ sung integration cho CRUD page chính
- Giai đoạn 3:
  - Bổ sung E2E cho auth, members, tree, payment, public tree
- Giai đoạn 4:
  - Ổn định visual regression và accessibility checks trong CI
