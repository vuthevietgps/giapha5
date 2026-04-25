# Test Matrix Theo Feature/Page

| Feature/Page | Route/Page | Luồng cần cover | Rủi ro chính | Ưu tiên | Automation đề xuất |
|---|---|---|---|---|---|
| Landing | `/`, `/home` | render hero, pricing fallback, CTA register/contact, mobile menu | hỏng CTA, lỗi render khi API plan fail | P2 | component + smoke |
| Login | `/login` | empty validation, login success/fail, redirect nếu đã login | chặn truy cập hệ thống, vòng lặp redirect | P0 | integration + E2E |
| Register | `/register` | validate email/password/confirm/phone, tạo tài khoản + family, auto redirect | tạo sai dữ liệu đầu vào, message sai | P0 | integration + E2E |
| Forgot password | `/forgot-password` | gửi email, message success/fail, disable loading | luồng khôi phục tài khoản hỏng | P1 | integration |
| Reset password | `/reset-password?token=` | token missing, confirm mismatch, reset success/fail | người dùng không đặt lại được mật khẩu | P1 | integration + E2E smoke |
| Verify email | `/verify-email?token=` | loading, token invalid, success/fail CTA | xác thực email sai trạng thái | P1 | integration |
| Auth guard + layout | protected routes + `App` | redirect khi chưa login, sidebar theo quyền, mobile drawer, logout | lộ route, menu sai role, mobile unusable | P0 | unit/integration |
| Dashboard | `/dashboard` | load stats, load subscription, load plans, error + retry | số liệu sai, dashboard trắng | P1 | integration |
| Users list/form | `/users`, `/users/new`, `/users/:id/edit` | filter, role-based fields, create/edit/delete, canManageUser | role mapping sai, quản trị sai người dùng | P0 | integration + E2E role smoke |
| Families list/form | `/families`, `/families/new`, `/families/:id/edit` | list, create/edit/delete, phone validation | CRUD family lỗi nền tảng | P1 | integration |
| Positions list/form | `/positions`, `/positions/new`, `/positions/:id/edit` | create/edit/delete, sortOrder validation | dữ liệu chức vụ sai ảnh hưởng member | P1 | integration |
| Members list/form | `/members`, `/members/new`, `/members/:id/edit` | filter theo family/q, upload photo, quan hệ cha/mẹ/vợ-chồng/con, union fallback | dữ liệu thành viên sai, quan hệ sai | P0 | integration + E2E |
| Member Tree | `/members/tree` | load family tree, zoom/pan, add/edit/delete member, dialog, export PNG, background/decor/text | feature phức tạp nhất, dễ regression | P0 | integration trọng điểm + E2E |
| Branch | `/members/branch` | chọn family/root, include spouse toggle, filter select/table, query params sync | nhánh quan tâm sai dữ liệu | P1 | integration |
| Branch Calendar | `/members/branch-calendar` | đổi family/root, lịch nhánh, lọc dữ liệu | logic lọc nhánh sai | P1 | integration/manual |
| Calendar | `/calendar` | chuyển tháng, select day, birthday/deathday, lunar day | hiển thị sự kiện sai ngày | P1 | unit + integration |
| Posts | `/posts`, `/posts/:id` | list, create dialog, detail render, permission create | bài viết không tạo/đọc được | P1 | integration |
| Plans | `/plans` | load plans, highlight current, unlimited -> contact, select paid plan -> `/payment` | điều hướng mua gói sai | P0 | integration + E2E smoke |
| Payment | `/payment?plan=&family=` | missing query -> redirect, create order, bank transfer info, copy content, polling, vnpay redirect, API error | mất doanh thu, UX thanh toán hỏng | P0 | integration + E2E |
| Payment callback | `/payment/callback` | response code success/fail, verify success/fail fallback, CTA navigation | xác nhận thanh toán sai | P0 | integration |
| Public tree | `/share/:token` | token invalid, loading/error, build generations, founder/spouse rendering, responsive public view | chia sẻ công khai hỏng, lộ trạng thái sai | P0 | integration + E2E |
| Print | `/print` | load family/background/tree asset, upload decor/svg, drag layers, zoom, export poster, localStorage restore | in ấn sai layout, export fail | P0 | manual + selective integration |
| Not found | `**` | route không tồn tại hiển thị 404 | UX điều hướng sai | P2 | smoke |

## Ma trận độ sâu kiểm thử

| Mức | Áp dụng |
|---|---|
| Smoke | login, guard, dashboard, plans, members, tree, payment callback |
| Regression mỗi release | auth, layout theo role, users, families, members, tree, payment, public tree, print |
| Exploratory | tree, print, responsive, clipboard, browser quirks |

## Tình huống bổ sung bắt buộc cho cây gia phả

| Scenario ID | Route/Page | Mức ưu tiên | Tình huống cần cover | Automation đề xuất |
|---|---|---|---|---|
| `FE-TREE-001` | `/members/tree` | P0 | Đổi family khi đang ở tree phải reload đúng dữ liệu cây mới | integration |
| `FE-TREE-002` | `/members/tree` | P0 | Focus vào một nhánh rồi refresh trang vẫn đọc đúng `query params` | integration + E2E |
| `FE-TREE-003` | `/members/tree` | P0 | Focus vào member nữ: label spouse, thao tác thêm con và hiển thị root không bị sai ngữ cảnh | manual + E2E |
| `FE-TREE-004` | `/members/tree` | P0 | Add child từ anchor của spouse nam và spouse nữ đều hoạt động đúng | E2E |
| `FE-TREE-005` | `/members/tree` | P0 | Nút `Tải lại` thực sự làm mới dữ liệu, không chỉ recenter UI | manual + integration |
| `FE-TREE-006` | `/members/tree` | P0 | Error banner + retry hoạt động khi API members/unions fail | integration |
| `FE-TREE-007` | `/members/tree` | P1 | Decor/text/background/couplet persist đúng theo family khi đổi family rồi quay lại | manual + integration |
| `FE-TREE-008` | `/members/tree` | P1 | Zoom, pan, node scale, center root, fit for reading không làm hỏng connection lines | manual |
| `FE-TREE-009` | `/members/tree` | P1 | Export PNG với cây lớn không crash và không mất overlay/decor quan trọng | manual |
| `FE-TREE-010` | `/members/tree` | P1 | Context menu mobile mở/đóng đúng, không bị lệch viewport | manual |

## Tình huống bổ sung cho auth, payment, public share

| Scenario ID | Route/Page | Mức ưu tiên | Tình huống cần cover | Automation đề xuất |
|---|---|---|---|---|
| `FE-AUTH-EXT-001` | protected routes | P0 | Token hết hạn trong lúc đang dùng app phải quay về login hoặc xử lý session hết hạn rõ ràng | E2E |
| `FE-AUTH-EXT-002` | `/login` | P0 | Login fail phải giữ lại dữ liệu form hợp lý, không reset gây khó dùng | integration |
| `FE-AUTH-EXT-003` | `/register` | P1 | Submit double click không tạo nhiều request thành công chồng lên nhau | integration |
| `FE-PAY-EXT-001` | `/payment` | P0 | Thiếu `plan` hoặc `family` query param phải redirect/hiển thị lỗi nhất quán | integration + E2E |
| `FE-PAY-EXT-002` | `/payment` | P0 | Chuyển khoản ngân hàng: copy payment content / account info không lỗi UI | manual |
| `FE-PAY-EXT-003` | `/payment/callback` | P0 | Callback reload lại trang vẫn hiển thị đúng trạng thái đã verify | integration |
| `FE-PAY-EXT-004` | `/payment/callback` | P1 | Callback fail nhưng verify API success fallback vẫn đưa về success state | integration |
| `FE-PUBLIC-EXT-001` | `/share/:token` | P0 | Token bị thu hồi sau khi đã từng hợp lệ phải hiển thị error state rõ ràng | E2E |
| `FE-PUBLIC-EXT-002` | `/share/:token` | P1 | Public tree với dữ liệu rỗng hoặc thiếu spouse vẫn render an toàn, không crash | integration |
| `FE-PRINT-EXT-001` | `/print` | P1 | Reload trang sau khi chỉnh layout phải restore state/local assets đúng nếu đã persist | manual |
