# Master Test Plan

## 1. Thông tin tài liệu

| Mục | Giá trị |
| --- | --- |
| Tài liệu | Master Test Plan |
| Hệ thống | Gia phả online |
| Phiên bản áp dụng | Áp dụng chung cho các cycle hiện tại đến khi có bản thay thế |
| Trạng thái | Draft dùng vận hành |
| Nguồn đầu vào ban đầu | `README.md`, `docs/review-backlog.md`, thay đổi thực tế trong repo |

## 2. Mục tiêu

- Thiết lập chuẩn QA chung cho toàn dự án.
- Bảo đảm mỗi cycle có cách xác định scope, thực thi, ghi nhận kết quả và sign-off nhất quán.
- Giảm rủi ro bỏ sót regression ở các khu vực có thay đổi thường xuyên như auth, tenant boundary, tree, backgrounds, print/export, quản trị dữ liệu.

## 3. Phạm vi test

### 3.1 In scope

- Xác thực và phân quyền người dùng.
- Quản lý dòng họ, thành viên, hôn phối.
- Cây gia phả: hiển thị, tương tác, điều hướng, layout, zoom, public share.
- Quản lý ảnh nền, ảnh đại diện, các cấu hình hiển thị liên quan.
- Quản trị người dùng, bài viết, audit, permission UX.
- In ấn và xuất cây.
- Smoke/regression cho các thay đổi backend và frontend ảnh hưởng luồng chính.

### 3.2 Out of scope mặc định

- Kiểm thử hiệu năng chuyên sâu với dữ liệu tải lớn nếu không có kế hoạch riêng.
- Pen-test chuyên nghiệp hoặc kiểm thử bảo mật cấp hạ tầng.
- Kiểm thử khả năng khôi phục thảm họa, sao lưu hoặc migration production trừ khi có release yêu cầu.

## 4. Chiến lược test

### 4.1 Các lớp kiểm thử

| Lớp | Mục đích | Khi chạy |
| --- | --- | --- |
| Smoke | Xác minh hệ thống đủ điều kiện test tiếp | Mỗi build/cycle |
| Functional | Kiểm tra hành vi theo yêu cầu và expected result | Theo scope thay đổi |
| Regression | Kiểm tra khu vực liên quan gián tiếp hoặc hay bị ảnh hưởng | Trước RC/Release |
| Exploratory | Tìm lỗi ngoài kịch bản, đặc biệt ở tree UX và public share | Sau smoke, trước sign-off |
| Security-focused | Kiểm tra boundary, permission, read-only, tenant/family scope | Khi có thay đổi auth/permission/data scope |
| Compatibility light | Kiểm tra tối thiểu desktop/mobile với luồng chính | Trước release |

### 4.2 Ưu tiên kiểm thử

Ưu tiên từ cao xuống thấp:

1. Tenant boundary, auth, permission, dữ liệu theo family.
2. CRUD nghiệp vụ cốt lõi: families, members, unions.
3. Tree rendering, public share, print/export.
4. Backgrounds, posts, user admin, audit.
5. Tối ưu UX, visual parity, cảnh báo build hoặc polish UI.

## 5. Test items

| Nhóm | Ví dụ hạng mục cần phủ |
| --- | --- |
| Auth & Session | login, logout, refresh token, 401 retry, route guard |
| Access Control | role/permission, tenant boundary, read-only CTA |
| Family Data | family CRUD, member CRUD, union CRUD, relation consistency |
| Tree & Share | tree layout, zoom, HUD, branch view, public share |
| Media & Background | upload, list, delete, scope theo family |
| Print & Export | export PNG, khổ giấy, orientation, nội dung hiển thị |
| Admin & Content | users, posts, audit trail |
| Responsive | mobile toolbar, action menu, public share mobile UX |

## 6. Không gian môi trường test

### 6.1 Môi trường tối thiểu

- Local dev hoặc môi trường tích hợp ổn định.
- Backend chạy được với MongoDB hợp lệ.
- Frontend truy cập được các luồng chính.
- Có ít nhất 3 loại tài khoản để test:
  - tài khoản quản trị;
  - tài khoản thường;
  - tài khoản thuộc family khác để kiểm tra boundary.

### 6.2 Dữ liệu test tối thiểu

- Ít nhất 2 family.
- Mỗi family có nhiều member và ít nhất 1 union để kiểm tra tree.
- Có dữ liệu ảnh nền hoặc ảnh đại diện mẫu.
- Có ít nhất 1 post và 1 user quản trị để test màn admin cơ bản.

## 7. Deliverables

- `qa/MASTER_TEST_PLAN.md`
- `qa/api/*` cho kế hoạch, matrix, mẫu testcase và report API
- `qa/frontend/*` cho kế hoạch, matrix, checklist và test case frontend
- traceability matrix theo cycle hoặc bản master
- testcase đã review
- test run và test result cho từng đợt thực thi
- daily QA report trong thời gian test
- bug summary trước sign-off
- release sign-off cuối cycle

## 8. Vai trò và trách nhiệm

| Vai trò | Trách nhiệm |
| --- | --- |
| QA owner | chốt scope test, điều phối run, tổng hợp risk, sign-off đề xuất |
| QA executor | viết/chạy testcase, log defect, cập nhật kết quả và evidence |
| Dev owner | làm rõ expected result, sửa lỗi, xác nhận impact/risk |
| PM/Release owner | chốt phạm vi release, ưu tiên bug, quyết định phát hành |

## 9. Entry criteria

Cycle test chỉ nên bắt đầu khi:

- scope release hoặc phạm vi thay đổi đã rõ;
- build triển khai lên môi trường test được;
- luồng smoke có dữ liệu nền tối thiểu;
- các dependency bắt buộc đã sẵn sàng hoặc đã biết rõ blocker;
- traceability đã được seed ở mức đủ để không test mù.

## 10. Exit criteria

Cycle có thể đề xuất sign-off khi:

- tất cả testcase `Must test` đã có trạng thái cuối cùng;
- không còn defect `Critical` hoặc `High` chưa có quyết định chấp nhận rủi ro;
- smoke pass trên build ứng viên phát hành;
- blocker còn lại đã được nêu rõ trong sign-off;
- bug summary và residual risk đã cập nhật.

## 11. Severity và quyết định xử lý

| Severity | Mô tả |
| --- | --- |
| Critical | Chặn hoàn toàn luồng chính, mất dữ liệu, sai boundary nghiêm trọng, lỗi bảo mật rõ ràng |
| High | Luồng quan trọng lỗi hoặc expected result sai đáng kể, chưa có workaround chấp nhận được |
| Medium | Lỗi có workaround, ảnh hưởng một phần chức năng hoặc dữ liệu phụ |
| Low | Lỗi UI, wording, layout nhẹ, không chặn nghiệp vụ |

## 12. Rủi ro chính cần theo dõi

| Rủi ro | Tác động | Cách giảm thiểu |
| --- | --- | --- |
| Chưa có baseline testcase đầy đủ | Dễ test thiếu vùng ảnh hưởng | Dùng traceability matrix làm nguồn master, bổ sung dần theo cycle |
| Nhiều thay đổi đồng thời backend/frontend | Regression chéo khó thấy sớm | Smoke sớm, gom bug theo khu vực và map owner |
| Boundary/permission thay đổi liên tục | Rò dữ liệu hoặc hiển thị sai quyền | Duy trì bộ smoke security-focused riêng |
| Tree/public share nhạy cảm với dữ liệu | Lỗi layout hoặc dữ liệu chỉ lộ trong tình huống cụ thể | Chuẩn hóa seed data đại diện nhiều nhánh |
| Môi trường không ổn định | Kết quả test nhiễu, blocker giả | Ghi rõ môi trường/build/data trong từng result |

## 13. Cách báo cáo

- Hằng ngày: cập nhật `daily report`.
- Mỗi cycle: cập nhật `test run`, `test result`, `bug summary`.
- Trước release: cập nhật `release sign-off`.
- Khi scope thay đổi: cập nhật `traceability matrix` trước rồi mới mở rộng testcase.

## 14. Quy tắc review và thay đổi

- Mọi thay đổi lớn về scope test phải phản ánh vào traceability và test run.
- Không xóa lịch sử kết quả cũ; tạo file mới theo cycle để giữ audit trail.
- Nếu chưa rõ expected result, đánh dấu `Need clarification`, không tự suy diễn.
